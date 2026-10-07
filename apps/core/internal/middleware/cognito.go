package middleware

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

const (
	keyCognitoSub      = "cognito_sub"
	keyCognitoEmail    = "cognito_email"
	keyCognitoName     = "cognito_name"
	keyCognitoUse      = "cognito_token_use"
	keyCognitoUsername = "cognito_username"
	keyCognitoProvider = "cognito_provider"

	jwksCacheTTL        = time.Hour
	jwksMinFetchGap     = 30 * time.Second
	jwksFetchTimeout    = 5 * time.Second
	jwksMaxBodyBytes    = 1 << 20
	minRSAModulusBits   = 2048
	cognitoClockLeeway  = 30 * time.Second
	tokenUseAccess      = "access"
	tokenUseID          = "id"
	unauthorizedMessage = "invalid or expired token"
)

// CognitoConfig configures validation of Amazon Cognito user pool tokens.
type CognitoConfig struct {
	Region      string
	UserPoolID  string
	AppClientID string
	// JWKSURL overrides the default Cognito JWKS endpoint (tests/overrides).
	JWKSURL string
}

// CognitoVerifier validates Cognito RS256 tokens against a cached JWKS.
type CognitoVerifier struct {
	issuer      string
	appClientID string
	jwksURL     string
	configured  bool
	client      *http.Client
	now         func() time.Time

	mu          sync.Mutex
	keys        map[string]*rsa.PublicKey
	fetchedAt   time.Time   // last successful fetch
	lastAttempt time.Time   // last fetch attempt (success or failure)
	flight      *jwksFlight // in-flight fetch shared by concurrent requests, nil when idle
}

// jwksFlight is one in-flight JWKS fetch that concurrent requests wait on.
type jwksFlight struct {
	done chan struct{}
}

// NewCognitoVerifier builds a verifier. When the pool or client id is empty the
// verifier is unconfigured and CognitoAuth rejects every request.
func NewCognitoVerifier(cfg CognitoConfig) *CognitoVerifier {
	v := &CognitoVerifier{
		appClientID: cfg.AppClientID,
		client:      &http.Client{Timeout: jwksFetchTimeout},
		now:         time.Now,
		configured:  cfg.UserPoolID != "" && cfg.AppClientID != "" && cfg.Region != "",
	}
	v.issuer = fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", cfg.Region, cfg.UserPoolID)
	v.jwksURL = cfg.JWKSURL
	if v.jwksURL == "" {
		v.jwksURL = v.issuer + "/.well-known/jwks.json"
	}
	return v
}

// CognitoAuth returns a middleware that validates a Cognito access or ID token
// and injects its identity claims into the Fiber context.
func CognitoAuth(v *CognitoVerifier) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !v.configured {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "shopper authentication unavailable",
			})
		}

		parts := strings.SplitN(c.Get("Authorization"), " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": unauthorizedMessage})
		}

		claims, err := v.verify(c.UserContext(), strings.TrimSpace(parts[1]))
		if err != nil {
			log.Printf("cognito: token rejected: %v", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": unauthorizedMessage})
		}

		str := func(k string) string { s, _ := claims[k].(string); return s }
		c.Locals(keyCognitoSub, str("sub"))
		c.Locals(keyCognitoEmail, str("email"))
		c.Locals(keyCognitoName, str("name"))
		c.Locals(keyCognitoUse, str("token_use"))
		c.Locals(keyCognitoUsername, firstNonEmpty(str("cognito:username"), str("username")))
		c.Locals(keyCognitoProvider, identityProvider(claims["identities"]))
		return c.Next()
	}
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

// identityProvider returns the first federated providerName from the
// "identities" claim, or "" when absent.
func identityProvider(raw any) string {
	list, _ := raw.([]any)
	for _, item := range list {
		if m, ok := item.(map[string]any); ok {
			if name, _ := m["providerName"].(string); name != "" {
				return name
			}
		}
	}
	return ""
}

func (v *CognitoVerifier) verify(ctx context.Context, raw string) (jwt.MapClaims, error) {
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithIssuer(v.issuer),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(cognitoClockLeeway),
		jwt.WithTimeFunc(v.now),
	)
	token, err := parser.Parse(raw, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, errors.New("unexpected signing method")
		}
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("missing kid")
		}
		return v.keyFor(ctx, kid)
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid claims")
	}
	if sub, _ := claims["sub"].(string); sub == "" {
		return nil, errors.New("empty sub")
	}

	switch use, _ := claims["token_use"].(string); use {
	case tokenUseAccess:
		if cid, _ := claims["client_id"].(string); cid != v.appClientID {
			return nil, errors.New("client_id mismatch")
		}
	case tokenUseID:
		if !audienceMatches(claims["aud"], v.appClientID) {
			return nil, errors.New("aud mismatch")
		}
	default:
		return nil, errors.New("unsupported token_use")
	}
	return claims, nil
}

func audienceMatches(aud any, want string) bool {
	switch a := aud.(type) {
	case string:
		return a == want
	case []any:
		return len(a) == 1 && a[0] == want
	}
	return false
}

// keyFor returns the public key for kid, refreshing the JWKS when the cache is
// stale or the kid is unknown. Fetches are spaced at least jwksMinFetchGap
// apart. The mutex only guards the cache state and is never held during
// network I/O: a cached key is served immediately, and concurrent requests that
// need a refetch share a single in-flight fetch.
func (v *CognitoVerifier) keyFor(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.Lock()
	now := v.now()
	stale := v.keys == nil || now.Sub(v.fetchedAt) >= jwksCacheTTL
	if !stale {
		if k, ok := v.keys[kid]; ok {
			v.mu.Unlock()
			return k, nil
		}
	}

	flight := v.flight
	leader := false
	if flight == nil && (v.lastAttempt.IsZero() || now.Sub(v.lastAttempt) >= jwksMinFetchGap) {
		flight = &jwksFlight{done: make(chan struct{})}
		v.flight = flight
		v.lastAttempt = now
		leader = true
	}
	v.mu.Unlock()

	if leader {
		v.runFetch(ctx, flight, now)
	} else if flight != nil {
		select {
		case <-flight.done:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	v.mu.Lock()
	defer v.mu.Unlock()
	if k, ok := v.keys[kid]; ok {
		return k, nil
	}
	return nil, errors.New("unknown kid")
}

// runFetch performs the shared fetch outside the lock and publishes the result.
// The fetch is detached from the leader's cancellation so one aborted request
// cannot fail the fetch the others are waiting on; it is still bounded by
// jwksFetchTimeout.
func (v *CognitoVerifier) runFetch(ctx context.Context, flight *jwksFlight, now time.Time) {
	keys, err := v.fetchJWKS(context.WithoutCancel(ctx))

	v.mu.Lock()
	if err != nil {
		// Keep serving previously fetched keys on a transient failure.
		log.Printf("cognito: jwks fetch failed: %v", err)
	} else {
		v.keys, v.fetchedAt = keys, now
	}
	v.flight = nil
	v.mu.Unlock()
	close(flight.done)
}

func (v *CognitoVerifier) fetchJWKS(ctx context.Context) (map[string]*rsa.PublicKey, error) {
	ctx, cancel := context.WithTimeout(ctx, jwksFetchTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("jwks status %d", resp.StatusCode)
	}

	var doc struct {
		Keys []struct {
			Kty string `json:"kty"`
			Kid string `json:"kid"`
			Alg string `json:"alg"`
			Use string `json:"use"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, jwksMaxBodyBytes)).Decode(&doc); err != nil {
		return nil, err
	}

	keys := make(map[string]*rsa.PublicKey, len(doc.Keys))
	for _, k := range doc.Keys {
		if k.Kty != "RSA" || k.Kid == "" || (k.Use != "" && k.Use != "sig") || (k.Alg != "" && k.Alg != "RS256") {
			continue
		}
		pub, err := parseRSAKey(k.N, k.E)
		if err != nil {
			continue
		}
		keys[k.Kid] = pub
	}
	if len(keys) == 0 {
		return nil, errors.New("jwks contains no usable keys")
	}
	return keys, nil
}

func parseRSAKey(n, e string) (*rsa.PublicKey, error) {
	nb, err := base64.RawURLEncoding.DecodeString(n)
	if err != nil {
		return nil, err
	}
	eb, err := base64.RawURLEncoding.DecodeString(e)
	if err != nil {
		return nil, err
	}
	mod := new(big.Int).SetBytes(nb)
	exp := new(big.Int).SetBytes(eb)
	if mod.BitLen() < minRSAModulusBits || !exp.IsInt64() || exp.Int64() < 3 || exp.Int64() > 1<<31-1 {
		return nil, errors.New("invalid rsa key")
	}
	return &rsa.PublicKey{N: mod, E: int(exp.Int64())}, nil
}

// GetCognitoSub returns the Cognito subject (stable user id).
func GetCognitoSub(c *fiber.Ctx) string { s, _ := c.Locals(keyCognitoSub).(string); return s }

// GetCognitoEmail returns the email claim ("" for access tokens).
func GetCognitoEmail(c *fiber.Ctx) string { s, _ := c.Locals(keyCognitoEmail).(string); return s }

// GetCognitoName returns the name claim ("" for access tokens).
func GetCognitoName(c *fiber.Ctx) string { s, _ := c.Locals(keyCognitoName).(string); return s }

// GetCognitoTokenUse returns "access" or "id".
func GetCognitoTokenUse(c *fiber.Ctx) string { s, _ := c.Locals(keyCognitoUse).(string); return s }

// GetCognitoUsername returns the Cognito username claim.
func GetCognitoUsername(c *fiber.Ctx) string { s, _ := c.Locals(keyCognitoUsername).(string); return s }

// GetCognitoProvider returns the federated identity provider ("" when native).
func GetCognitoProvider(c *fiber.Ctx) string { s, _ := c.Locals(keyCognitoProvider).(string); return s }
