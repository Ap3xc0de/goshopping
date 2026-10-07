package middleware

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

const (
	testRegion = "us-east-1"
	testPool   = "us-east-1_TESTPOOL"
	testClient = "test-client-id"
	testIssuer = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TESTPOOL"
)

type jwksServer struct {
	*httptest.Server
	mu    sync.Mutex
	keys  map[string]*rsa.PublicKey
	hits  atomic.Int32
	fails atomic.Bool
	// gate, when set, makes every request block until it is closed; entered
	// receives one value per request that reached the handler.
	gate    atomic.Pointer[chan struct{}]
	entered chan struct{}
}

func newJWKSServer(t *testing.T, keys map[string]*rsa.PublicKey) *jwksServer {
	t.Helper()
	s := &jwksServer{keys: keys, entered: make(chan struct{}, 64)}
	s.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.hits.Add(1)
		if g := s.gate.Load(); g != nil {
			s.entered <- struct{}{}
			<-*g
		}
		if s.fails.Load() {
			http.Error(w, "boom", http.StatusInternalServerError)
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		type jwk struct {
			Kty string `json:"kty"`
			Kid string `json:"kid"`
			Alg string `json:"alg"`
			Use string `json:"use"`
			N   string `json:"n"`
			E   string `json:"e"`
		}
		var out struct {
			Keys []jwk `json:"keys"`
		}
		for kid, pub := range s.keys {
			out.Keys = append(out.Keys, jwk{
				Kty: "RSA", Kid: kid, Alg: "RS256", Use: "sig",
				N: base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
				E: base64.RawURLEncoding.EncodeToString(big.NewInt(int64(pub.E)).Bytes()),
			})
		}
		_ = json.NewEncoder(w).Encode(out)
	}))
	t.Cleanup(s.Close)
	return s
}

func (s *jwksServer) setKeys(keys map[string]*rsa.PublicKey) {
	s.mu.Lock()
	s.keys = keys
	s.mu.Unlock()
}

func genKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	k, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return k
}

func accessClaims() jwt.MapClaims {
	return jwt.MapClaims{
		"iss":       testIssuer,
		"sub":       "sub-123",
		"token_use": "access",
		"client_id": testClient,
		"username":  "user-123",
		"exp":       time.Now().Add(time.Hour).Unix(),
	}
}

func idClaims() jwt.MapClaims {
	return jwt.MapClaims{
		"iss":              testIssuer,
		"sub":              "sub-123",
		"token_use":        "id",
		"aud":              testClient,
		"email":            "ana@example.com",
		"name":             "Ana",
		"cognito:username": "user-123",
		"exp":              time.Now().Add(time.Hour).Unix(),
	}
}

func signRS256(t *testing.T, key *rsa.PrivateKey, kid string, claims jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = kid
	s, err := tok.SignedString(key)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return s
}

type cognitoFixture struct {
	app *fiber.App
	srv *jwksServer
	v   *CognitoVerifier
	key *rsa.PrivateKey
	now time.Time
}

func newCognitoFixture(t *testing.T) *cognitoFixture {
	t.Helper()
	key := genKey(t)
	srv := newJWKSServer(t, map[string]*rsa.PublicKey{"kid-1": &key.PublicKey})
	v := NewCognitoVerifier(CognitoConfig{
		Region: testRegion, UserPoolID: testPool, AppClientID: testClient, JWKSURL: srv.URL,
	})
	f := &cognitoFixture{srv: srv, v: v, key: key, now: time.Now()}
	v.now = func() time.Time { return f.now }
	app := fiber.New()
	app.Get("/who", CognitoAuth(v), func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"sub":       GetCognitoSub(c),
			"email":     GetCognitoEmail(c),
			"name":      GetCognitoName(c),
			"token_use": GetCognitoTokenUse(c),
			"provider":  GetCognitoProvider(c),
		})
	})
	f.app = app
	return f
}

func (f *cognitoFixture) do(t *testing.T, header string) (int, map[string]any) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/who", nil)
	if header != "" {
		req.Header.Set("Authorization", header)
	}
	resp, err := f.app.Test(req, 5000)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	defer resp.Body.Close()
	var body map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&body)
	return resp.StatusCode, body
}

func TestCognitoAuth_ValidAccessToken(t *testing.T) {
	f := newCognitoFixture(t)
	code, body := f.do(t, "Bearer "+signRS256(t, f.key, "kid-1", accessClaims()))
	if code != 200 || body["sub"] != "sub-123" || body["token_use"] != "access" {
		t.Fatalf("got %d %v", code, body)
	}
}

func TestCognitoAuth_ValidIDToken(t *testing.T) {
	f := newCognitoFixture(t)
	code, body := f.do(t, "Bearer "+signRS256(t, f.key, "kid-1", idClaims()))
	if code != 200 || body["email"] != "ana@example.com" || body["name"] != "Ana" || body["token_use"] != "id" {
		t.Fatalf("got %d %v", code, body)
	}
}

func TestCognitoAuth_FederatedProvider(t *testing.T) {
	f := newCognitoFixture(t)
	c := idClaims()
	c["identities"] = []any{map[string]any{"providerName": "Google", "userId": "1"}}
	code, body := f.do(t, "Bearer "+signRS256(t, f.key, "kid-1", c))
	if code != 200 || body["provider"] != "Google" {
		t.Fatalf("got %d %v", code, body)
	}
}

func TestCognitoAuth_Rejections(t *testing.T) {
	f := newCognitoFixture(t)
	other := genKey(t)

	mut := func(base jwt.MapClaims, k string, v any) jwt.MapClaims {
		c := jwt.MapClaims{}
		for kk, vv := range base {
			c[kk] = vv
		}
		if v == nil {
			delete(c, k)
		} else {
			c[k] = v
		}
		return c
	}

	hs256, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims()).SignedString(
		[]byte(base64.StdEncoding.EncodeToString(f.key.PublicKey.N.Bytes())))
	hsKid := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims())
	hsKid.Header["kid"] = "kid-1"
	hs256Kid, _ := hsKid.SignedString([]byte(f.key.PublicKey.N.Bytes()))
	none, _ := jwt.NewWithClaims(jwt.SigningMethodNone, accessClaims()).SignedString(jwt.UnsafeAllowNoneSignatureType)

	cases := map[string]string{
		"expired":             "Bearer " + signRS256(t, f.key, "kid-1", mut(accessClaims(), "exp", time.Now().Add(-time.Hour).Unix())),
		"wrong issuer":        "Bearer " + signRS256(t, f.key, "kid-1", mut(accessClaims(), "iss", "https://evil.example.com")),
		"wrong client_id":     "Bearer " + signRS256(t, f.key, "kid-1", mut(accessClaims(), "client_id", "other")),
		"missing client_id":   "Bearer " + signRS256(t, f.key, "kid-1", mut(accessClaims(), "client_id", nil)),
		"wrong aud":           "Bearer " + signRS256(t, f.key, "kid-1", mut(idClaims(), "aud", "other")),
		"empty sub":           "Bearer " + signRS256(t, f.key, "kid-1", mut(accessClaims(), "sub", "")),
		"bad token_use":       "Bearer " + signRS256(t, f.key, "kid-1", mut(accessClaims(), "token_use", "refresh")),
		"unknown kid":         "Bearer " + signRS256(t, f.key, "nope", accessClaims()),
		"missing kid":         "Bearer " + signRS256(t, f.key, "", accessClaims()),
		"signed by other key": "Bearer " + signRS256(t, other, "kid-1", accessClaims()),
		"hs256 alg confusion": "Bearer " + hs256,
		"hs256 with kid":      "Bearer " + hs256Kid,
		"alg none":            "Bearer " + none,
		"garbage":             "Bearer not-a-jwt",
		"missing header":      "",
		"not bearer":          "Basic abc",
		"bearer only":         "Bearer",
	}
	for name, header := range cases {
		t.Run(name, func(t *testing.T) {
			code, body := f.do(t, header)
			if code != 401 {
				t.Fatalf("expected 401, got %d %v", code, body)
			}
			if msg, _ := body["error"].(string); msg == "" {
				t.Fatalf("expected generic error body, got %v", body)
			}
		})
	}
}

func TestCognitoAuth_FailsClosedWhenUnconfigured(t *testing.T) {
	for name, cfg := range map[string]CognitoConfig{
		"no pool":   {Region: testRegion, AppClientID: testClient},
		"no client": {Region: testRegion, UserPoolID: testPool},
		"none":      {},
	} {
		t.Run(name, func(t *testing.T) {
			app := fiber.New()
			app.Get("/who", CognitoAuth(NewCognitoVerifier(cfg)), func(c *fiber.Ctx) error { return c.SendStatus(200) })
			resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/who", nil))
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != http.StatusServiceUnavailable {
				t.Fatalf("expected 503, got %d", resp.StatusCode)
			}
		})
	}
}

func TestCognitoVerifier_DefaultJWKSURL(t *testing.T) {
	v := NewCognitoVerifier(CognitoConfig{Region: testRegion, UserPoolID: testPool, AppClientID: testClient})
	want := testIssuer + "/.well-known/jwks.json"
	if v.jwksURL != want || v.issuer != testIssuer {
		t.Fatalf("jwksURL=%q issuer=%q", v.jwksURL, v.issuer)
	}
}

func TestCognitoAuth_JWKSCachedBetweenRequests(t *testing.T) {
	f := newCognitoFixture(t)
	tok := "Bearer " + signRS256(t, f.key, "kid-1", accessClaims())
	for i := 0; i < 3; i++ {
		if code, _ := f.do(t, tok); code != 200 {
			t.Fatalf("got %d", code)
		}
	}
	if h := f.srv.hits.Load(); h != 1 {
		t.Fatalf("expected 1 JWKS fetch, got %d", h)
	}
}

func TestCognitoAuth_CacheExpiresAfterTTL(t *testing.T) {
	f := newCognitoFixture(t)
	// The token outlives the clock jump below, so the second request is valid
	// and only the expired JWKS cache can trigger the refetch.
	claims := accessClaims()
	claims["exp"] = f.now.Add(3 * time.Hour).Unix()
	tok := "Bearer " + signRS256(t, f.key, "kid-1", claims)
	if code, _ := f.do(t, tok); code != 200 {
		t.Fatalf("expected 200, got %d", code)
	}
	f.now = f.now.Add(61 * time.Minute)
	if code, _ := f.do(t, tok); code != 200 {
		t.Fatalf("expected 200 after TTL expiry and refetch, got %d", code)
	}
	if h := f.srv.hits.Load(); h != 2 {
		t.Fatalf("expected 2 JWKS fetches, got %d", h)
	}
}

func TestCognitoAuth_RefetchOnKeyRotation(t *testing.T) {
	f := newCognitoFixture(t)
	f.do(t, "Bearer "+signRS256(t, f.key, "kid-1", accessClaims()))

	newKey := genKey(t)
	f.srv.setKeys(map[string]*rsa.PublicKey{"kid-1": &f.key.PublicKey, "kid-2": &newKey.PublicKey})
	f.now = f.now.Add(time.Minute) // past the forced-refetch interval

	code, _ := f.do(t, "Bearer "+signRS256(t, newKey, "kid-2", accessClaims()))
	if code != 200 {
		t.Fatalf("expected 200 after rotation, got %d", code)
	}
}

func TestCognitoAuth_ForcedRefetchIsRateLimited(t *testing.T) {
	f := newCognitoFixture(t)
	f.do(t, "Bearer "+signRS256(t, f.key, "kid-1", accessClaims())) // initial fetch (1)

	f.now = f.now.Add(time.Minute)
	bad := "Bearer " + signRS256(t, f.key, "unknown", accessClaims())
	for i := 0; i < 5; i++ {
		if code, _ := f.do(t, bad); code != 401 {
			t.Fatalf("expected 401, got %d", code)
		}
	}
	if h := f.srv.hits.Load(); h != 2 {
		t.Fatalf("expected exactly 1 forced refetch (2 total), got %d", h)
	}

	f.now = f.now.Add(31 * time.Second)
	f.do(t, bad)
	if h := f.srv.hits.Load(); h != 3 {
		t.Fatalf("expected another refetch after the interval, got %d", h)
	}
}

func TestCognitoAuth_JWKSFetchFailureIs401(t *testing.T) {
	f := newCognitoFixture(t)
	f.srv.fails.Store(true)
	code, body := f.do(t, "Bearer "+signRS256(t, f.key, "kid-1", accessClaims()))
	if code != 401 {
		t.Fatalf("expected 401, got %d %v", code, body)
	}
}

// block gates every JWKS request; the returned func opens the gate (idempotent).
func (s *jwksServer) block() (release func()) {
	g := make(chan struct{})
	s.gate.Store(&g)
	var once sync.Once
	release = func() { once.Do(func() { close(g) }) }
	return release
}

func (f *cognitoFixture) doAsync(t *testing.T, header string) <-chan int {
	t.Helper()
	out := make(chan int, 1)
	go func() {
		req := httptest.NewRequest(http.MethodGet, "/who", nil)
		req.Header.Set("Authorization", header)
		resp, err := f.app.Test(req, 10000)
		if err != nil {
			out <- -1
			return
		}
		resp.Body.Close()
		out <- resp.StatusCode
	}()
	return out
}

func TestCognitoAuth_SlowJWKSDoesNotBlockCachedKeys(t *testing.T) {
	f := newCognitoFixture(t)
	cached := "Bearer " + signRS256(t, f.key, "kid-1", accessClaims())
	if code, _ := f.do(t, cached); code != 200 {
		t.Fatalf("warm-up: expected 200, got %d", code)
	}

	release := f.srv.block()
	defer release()
	f.now = f.now.Add(time.Minute) // past the minimum gap: unknown kid forces a refetch

	unknown := f.doAsync(t, "Bearer "+signRS256(t, f.key, "unknown", accessClaims()))
	select {
	case <-f.srv.entered:
	case <-time.After(3 * time.Second):
		t.Fatal("refetch never started")
	}

	select {
	case code := <-f.doAsync(t, cached):
		if code != 200 {
			t.Fatalf("cached-key request: expected 200, got %d", code)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("cached-key request blocked behind the in-flight JWKS fetch")
	}

	release()
	if code := <-unknown; code != 401 {
		t.Fatalf("unknown kid: expected 401, got %d", code)
	}
}

func TestCognitoAuth_ConcurrentUnknownKidsShareOneFetch(t *testing.T) {
	f := newCognitoFixture(t)
	if code, _ := f.do(t, "Bearer "+signRS256(t, f.key, "kid-1", accessClaims())); code != 200 {
		t.Fatalf("warm-up: expected 200, got %d", code)
	}
	newKey := genKey(t)
	f.srv.setKeys(map[string]*rsa.PublicKey{"kid-1": &f.key.PublicKey, "kid-2": &newKey.PublicKey})
	f.now = f.now.Add(time.Minute)

	release := f.srv.block()
	defer release()
	const n = 10
	tok := "Bearer " + signRS256(t, newKey, "kid-2", accessClaims())
	results := make([]<-chan int, n)
	for i := range results {
		results[i] = f.doAsync(t, tok)
	}
	select {
	case <-f.srv.entered:
	case <-time.After(3 * time.Second):
		t.Fatal("refetch never started")
	}
	time.Sleep(200 * time.Millisecond) // let the other requests pile up behind the flight
	release()
	for i, r := range results {
		if code := <-r; code != 200 {
			t.Fatalf("request %d: expected 200 after shared refetch, got %d", i, code)
		}
	}
	if h := f.srv.hits.Load(); h != 2 {
		t.Fatalf("expected 1 shared refetch (2 total), got %d", h)
	}
}

func TestCognitoAuth_ColdCacheConcurrentRequestsShareOneFetch(t *testing.T) {
	f := newCognitoFixture(t)
	release := f.srv.block()
	defer release()
	const n = 10
	tok := "Bearer " + signRS256(t, f.key, "kid-1", accessClaims())
	results := make([]<-chan int, n)
	for i := range results {
		results[i] = f.doAsync(t, tok)
	}
	select {
	case <-f.srv.entered:
	case <-time.After(3 * time.Second):
		t.Fatal("initial fetch never started")
	}
	time.Sleep(200 * time.Millisecond)
	release()
	for i, r := range results {
		if code := <-r; code != 200 {
			t.Fatalf("request %d: expected 200, got %d", i, code)
		}
	}
	if h := f.srv.hits.Load(); h != 1 {
		t.Fatalf("expected a single shared fetch, got %d", h)
	}
}
