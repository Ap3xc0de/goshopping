package handlers_test

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	shopperPoolID   = "us-east-1_SHOPPERS"
	shopperClientID = "shopper-app-client"
	shopperIssuer   = "https://cognito-idp.us-east-1.amazonaws.com/" + shopperPoolID
	shopperKid      = "test-kid"
)

type shopperEnv struct {
	app *testutil.TestApp
	key *rsa.PrivateKey
}

func newShopperEnv(t *testing.T) *shopperEnv {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	jwks := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kty": "RSA", "kid": shopperKid, "alg": "RS256", "use": "sig",
			"n": base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes()),
			"e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.PublicKey.E)).Bytes()),
		}}})
	}))
	t.Cleanup(jwks.Close)

	app := testutil.SetupTestAppWithConfig(t, func(cfg *config.Config) {
		cfg.CognitoRegion = "us-east-1"
		cfg.CognitoUserPoolID = shopperPoolID
		cfg.CognitoAppClientID = shopperClientID
		cfg.CognitoJWKSURL = jwks.URL
	})
	t.Cleanup(app.Cleanup)
	return &shopperEnv{app: app, key: key}
}

func (e *shopperEnv) token(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = shopperKid
	s, err := tok.SignedString(e.key)
	require.NoError(t, err)
	return "Bearer " + s
}

func shopperAccess(sub string) jwt.MapClaims {
	return jwt.MapClaims{
		"iss": shopperIssuer, "sub": sub, "token_use": "access",
		"client_id": shopperClientID, "exp": time.Now().Add(time.Hour).Unix(),
	}
}

func shopperID(sub, email, name string) jwt.MapClaims {
	return jwt.MapClaims{
		"iss": shopperIssuer, "sub": sub, "token_use": "id", "aud": shopperClientID,
		"email": email, "name": name, "exp": time.Now().Add(time.Hour).Unix(),
	}
}

func decodeMe(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	defer resp.Body.Close()
	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	return body
}

func TestGetMe_AccessTokenCreatesShopper(t *testing.T) {
	e := newShopperEnv(t)
	resp := e.app.GET(t, "/me", e.token(t, shopperAccess("sub-a")))
	testutil.AssertStatus(t, resp, http.StatusOK)

	body := decodeMe(t, resp)
	assert.NotEmpty(t, body["id"])
	assert.Equal(t, "cognito", body["auth_provider"])
	assert.NotEmpty(t, body["created_at"])
	assert.NotContains(t, body, "cognito_sub")
}

func TestGetMe_IDTokenStoresProfileAndIsIdempotent(t *testing.T) {
	e := newShopperEnv(t)
	auth := e.token(t, shopperID("sub-b", "ana@example.com", "Ana"))

	first := decodeMe(t, e.app.GET(t, "/me", auth))
	assert.Equal(t, "ana@example.com", first["email"])
	assert.Equal(t, "Ana", first["name"])

	second := decodeMe(t, e.app.GET(t, "/me", auth))
	assert.Equal(t, first["id"], second["id"])

	var n int
	require.NoError(t, e.app.DB.QueryRow(t.Context(), `SELECT count(*) FROM shoppers WHERE cognito_sub = 'sub-b'`).Scan(&n))
	assert.Equal(t, 1, n)
}

func TestGetMe_AccessTokenDoesNotBlankProfile(t *testing.T) {
	e := newShopperEnv(t)
	idBody := decodeMe(t, e.app.GET(t, "/me", e.token(t, shopperID("sub-c", "c@example.com", "Cleo"))))

	resp := e.app.GET(t, "/me", e.token(t, shopperAccess("sub-c")))
	testutil.AssertStatus(t, resp, http.StatusOK)
	body := decodeMe(t, resp)
	assert.Equal(t, idBody["id"], body["id"])
	assert.Equal(t, "c@example.com", body["email"])
	assert.Equal(t, "Cleo", body["name"])
}

func TestGetMe_UpdatesProfileWhenClaimsChange(t *testing.T) {
	e := newShopperEnv(t)
	e.app.GET(t, "/me", e.token(t, shopperID("sub-d", "old@example.com", "Old")))
	body := decodeMe(t, e.app.GET(t, "/me", e.token(t, shopperID("sub-d", "new@example.com", "New"))))
	assert.Equal(t, "new@example.com", body["email"])
	assert.Equal(t, "New", body["name"])
}

func TestGetMe_FederatedProviderStored(t *testing.T) {
	e := newShopperEnv(t)
	c := shopperID("sub-e", "e@example.com", "Eve")
	c["identities"] = []any{map[string]any{"providerName": "Google"}}
	body := decodeMe(t, e.app.GET(t, "/me", e.token(t, c)))
	assert.Equal(t, "Google", body["auth_provider"])
}

func TestGetMe_Rejections(t *testing.T) {
	e := newShopperEnv(t)

	expired := shopperAccess("sub-x")
	expired["exp"] = time.Now().Add(-time.Hour).Unix()
	badIss := shopperAccess("sub-x")
	badIss["iss"] = "https://cognito-idp.us-east-1.amazonaws.com/other"
	badClient := shopperAccess("sub-x")
	badClient["client_id"] = "other"
	badAud := shopperID("sub-x", "x@example.com", "X")
	badAud["aud"] = "other"

	none, _ := jwt.NewWithClaims(jwt.SigningMethodNone, shopperAccess("sub-x")).SignedString(jwt.UnsafeAllowNoneSignatureType)
	hs := jwt.NewWithClaims(jwt.SigningMethodHS256, shopperAccess("sub-x"))
	hs.Header["kid"] = shopperKid
	hsTok, _ := hs.SignedString(e.key.PublicKey.N.Bytes())

	unknownKid := jwt.NewWithClaims(jwt.SigningMethodRS256, shopperAccess("sub-x"))
	unknownKid.Header["kid"] = "other-kid"
	unknownKidTok, _ := unknownKid.SignedString(e.key)

	cases := map[string]string{
		"expired":          e.token(t, expired),
		"wrong issuer":     e.token(t, badIss),
		"wrong client_id":  e.token(t, badClient),
		"wrong aud":        e.token(t, badAud),
		"unknown kid":      "Bearer " + unknownKidTok,
		"hs256 confusion":  "Bearer " + hsTok,
		"alg none":         "Bearer " + none,
		"seller jwt":       "",
		"missing header":   "",
		"malformed header": "Token abc",
		"garbage bearer":   "Bearer xyz",
	}
	sellerHeader, _, _ := e.app.OwnerAuthHeader(t)
	cases["seller jwt"] = sellerHeader

	for name, header := range cases {
		t.Run(name, func(t *testing.T) {
			resp := e.app.GET(t, "/me", header)
			testutil.AssertStatus(t, resp, http.StatusUnauthorized)
			assert.NotEmpty(t, decodeMe(t, resp)["error"])
		})
	}

	var n int
	require.NoError(t, e.app.DB.QueryRow(t.Context(), `SELECT count(*) FROM shoppers`).Scan(&n))
	assert.Equal(t, 0, n, "rejected tokens must not create shoppers")
}

func TestGetMe_FailsClosedWhenCognitoUnconfigured(t *testing.T) {
	app := testutil.SetupTestApp(t) // no pool / client configured
	defer app.Cleanup()

	resp := app.GET(t, "/me", "Bearer anything")
	testutil.AssertStatus(t, resp, http.StatusServiceUnavailable)
}

func TestSellerRoutesIgnoreCognitoTokens(t *testing.T) {
	e := newShopperEnv(t)
	resp := e.app.GET(t, "/stores/00000000-0000-0000-0000-000000000000/products", e.token(t, shopperAccess("sub-s")))
	testutil.AssertStatus(t, resp, http.StatusUnauthorized)
}
