package testutil

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/database"
	"github.com/goshopping/core/internal/router"
	"github.com/goshopping/core/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TestJWTSecret is >=32 chars so it satisfies minJWTSecretLen if Validate is ever called in tests.
const TestJWTSecret = "test-secret-for-goshopping-tests-xxxxxxxx"

// TestApp holds the test application and its dependencies.
type TestApp struct {
	App    *fiber.App
	DB     *pgxpool.Pool
	Config *config.Config
}

// SetupTestApp creates a fresh Fiber app wired to the test database.
// Callers MUST defer app.Cleanup().
func SetupTestApp(t *testing.T) *TestApp {
	t.Helper()

	cfg := config.Load()
	cfg.JWTSecret = TestJWTSecret
	cfg.AppEnv = "development"
	// Avoid AWS SDK timeouts when ElasticMQ isn't running during unit tests.
	cfg.SQSOrderEventsURL = ""
	cfg.SQSPaymentEventsURL = ""
	cfg.SQSAccountingEventsURL = ""
	cfg.SQSNotificationEventsURL = ""
	cfg.SQSMarketingEventsURL = ""

	db := database.Connect(cfg)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			msg := "internal server error"
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
				msg = e.Message
			}
			return c.Status(code).JSON(fiber.Map{"error": msg})
		},
	})

	eventSvc := services.NewEventService(cfg)
	router.Setup(app, cfg, db, eventSvc)

	ta := &TestApp{App: app, DB: db, Config: cfg}
	ta.CleanDB(t)
	return ta
}

// CleanDB removes all data in dependency-safe order.
func (ta *TestApp) CleanDB(t *testing.T) {
	t.Helper()
	ctx := context.Background()
	tables := []string{
		"audit_log",
		"order_timeline",
		"integrations",
		"orders",
		"products",
		"customers",
		"refresh_tokens",
		"store_users",
		"stores",
		"accounts",
	}
	for _, tbl := range tables {
		if _, err := ta.DB.Exec(ctx, fmt.Sprintf("DELETE FROM %s", tbl)); err != nil {
			// Non-fatal: table may not exist in test env
			t.Logf("CleanDB: could not clean %s: %v", tbl, err)
		}
	}
}

// Cleanup closes DB pool after test completes.
func (ta *TestApp) Cleanup() {
	ta.DB.Close()
}

// OwnerAuthHeader creates an account + store + store_user, then returns
// (Bearer token, accountID string, storeID string).
func (ta *TestApp) OwnerAuthHeader(t *testing.T) (header, accountID, storeID string) {
	t.Helper()
	ctx := context.Background()

	accID := uuid.New()
	email := fmt.Sprintf("owner-%s@test.com", accID)
	if _, err := ta.DB.Exec(ctx, `
		INSERT INTO accounts (id, email, password_hash, name, role, status)
		VALUES ($1, $2, $3, $4, 'owner', 'active')`,
		accID, email, "$2a$12$placeholder", "Test Owner",
	); err != nil {
		t.Fatalf("OwnerAuthHeader: insert account: %v", err)
	}

	sID := uuid.New()
	slug := fmt.Sprintf("test-store-%s", sID)
	if _, err := ta.DB.Exec(ctx, `
		INSERT INTO stores (id, account_id, name, slug, domain, status, config)
		VALUES ($1, $2, $3, $4, '', 'active', '{}')`,
		sID, accID, "Test Store", slug,
	); err != nil {
		t.Fatalf("OwnerAuthHeader: insert store: %v", err)
	}

	if _, err := ta.DB.Exec(ctx, `
		INSERT INTO store_users (store_id, account_id, role)
		VALUES ($1, $2, 'owner')`,
		sID, accID,
	); err != nil {
		t.Fatalf("OwnerAuthHeader: insert store_user: %v", err)
	}

	token := generateTestJWT(t, accID.String(), "owner", sID.String(), "owner", ta.Config.JWTSecret)
	return "Bearer " + token, accID.String(), sID.String()
}

// SuperAdminAuthHeader creates a superadmin account, returns (Bearer token, accountID).
func (ta *TestApp) SuperAdminAuthHeader(t *testing.T) (header, accountID string) {
	t.Helper()
	ctx := context.Background()

	accID := uuid.New()
	email := fmt.Sprintf("superadmin-%s@test.com", accID)
	if _, err := ta.DB.Exec(ctx, `
		INSERT INTO accounts (id, email, password_hash, name, role, status)
		VALUES ($1, $2, $3, $4, 'superadmin', 'active')`,
		accID, email, "$2a$12$placeholder", "Super Admin",
	); err != nil {
		t.Fatalf("SuperAdminAuthHeader: insert account: %v", err)
	}

	token := generateTestJWT(t, accID.String(), "superadmin", "", "", ta.Config.JWTSecret)
	return "Bearer " + token, accID.String()
}

// CreateOtherOwner creates a second independent owner account + store.
func (ta *TestApp) CreateOtherOwner(t *testing.T) (header, accountID, storeID string) {
	t.Helper()
	return ta.OwnerAuthHeader(t)
}

// --- HTTP helpers ---

func (ta *TestApp) GET(t *testing.T, path, authHeader string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := ta.App.Test(req, 10000)
	if err != nil {
		t.Fatalf("GET %s: %v", path, err)
	}
	return resp
}

func (ta *TestApp) POST(t *testing.T, path string, body interface{}, authHeader string) *http.Response {
	t.Helper()
	return ta.doJSON(t, http.MethodPost, path, body, authHeader)
}

func (ta *TestApp) PUT(t *testing.T, path string, body interface{}, authHeader string) *http.Response {
	t.Helper()
	return ta.doJSON(t, http.MethodPut, path, body, authHeader)
}

func (ta *TestApp) PATCH(t *testing.T, path string, body interface{}, authHeader string) *http.Response {
	t.Helper()
	return ta.doJSON(t, http.MethodPatch, path, body, authHeader)
}

func (ta *TestApp) DELETE(t *testing.T, path, authHeader string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodDelete, path, nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := ta.App.Test(req, 10000)
	if err != nil {
		t.Fatalf("DELETE %s: %v", path, err)
	}
	return resp
}

func (ta *TestApp) POSTFile(t *testing.T, path, fieldName, fileName, content, authHeader string) *http.Response {
	t.Helper()
	body := &bytes.Buffer{}
	w := multipart.NewWriter(body)
	fw, err := w.CreateFormFile(fieldName, fileName)
	if err != nil {
		t.Fatalf("POSTFile: create form file: %v", err)
	}
	if _, err := io.Copy(fw, strings.NewReader(content)); err != nil {
		t.Fatalf("POSTFile: write content: %v", err)
	}
	w.Close()

	req := httptest.NewRequest(http.MethodPost, path, body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := ta.App.Test(req, 10000)
	if err != nil {
		t.Fatalf("POSTFile %s: %v", path, err)
	}
	return resp
}

func (ta *TestApp) doJSON(t *testing.T, method, path string, body interface{}, authHeader string) *http.Response {
	t.Helper()
	var r io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("doJSON marshal: %v", err)
		}
		r = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, r)
	req.Header.Set("Content-Type", "application/json")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := ta.App.Test(req, 10000)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	return resp
}

// generateTestJWT creates a signed HS256 JWT mirroring what auth_service.go produces.
func generateTestJWT(t *testing.T, accountID, role, storeID, storeRole, secret string) string {
	t.Helper()

	stores := []map[string]string{}
	if storeID != "" {
		stores = append(stores, map[string]string{
			"store_id": storeID,
			"role":     storeRole,
		})
	}

	claims := jwt.MapClaims{
		"sub":        accountID,
		"role":       role,
		"stores":     stores,
		"token_type": "access",
		"iat":        time.Now().Unix(),
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	}

	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("generateTestJWT: %v", err)
	}
	return token
}
