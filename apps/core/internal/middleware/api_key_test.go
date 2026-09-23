package middleware_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/database"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupAPIKeyMiddleware wires a minimal Fiber app with RequireAPIKey in front
// of a single ping route — the same way router.go mounts it on the /api/v1
// group — and returns two stores so the cross-store 403 path is reachable.
func setupAPIKeyMiddleware(t *testing.T) (*fiber.App, *pgxpool.Pool, *services.APIKeyService, uuid.UUID, string, uuid.UUID, string) {
	t.Helper()

	cfg := &config.Config{
		DBHost:     envOrSkip(t),
		DBPort:     "5434",
		DBUser:     "goshopping",
		DBPassword: "localdev123",
		DBName:     "goshopping",
		DBSSLMode:  "disable",
	}
	db := database.Connect(cfg)
	t.Cleanup(db.Close)
	database.RunMigrations(cfg)

	storeA, slugA := createMiddlewareTestStore(t, db)
	storeB, slugB := createMiddlewareTestStore(t, db)

	svc := services.NewAPIKeyService(db)

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
	app.Get("/api/v1/:storeSlug/ping", middleware.RequireAPIKey(svc), func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"store_id": middleware.GetStoreID(c).String()})
	})

	return app, db, svc, storeA, slugA, storeB, slugB
}

// envOrSkip mirrors the services package's integration-test gate: without
// DB_HOST the suite runs where no database exists (e.g. CI lint jobs).
func envOrSkip(t *testing.T) string {
	t.Helper()
	host := os.Getenv("DB_HOST")
	if host == "" {
		t.Skip("DB_HOST env var not set, skipping integration test")
	}
	return host
}

func createMiddlewareTestStore(t *testing.T, db *pgxpool.Pool) (uuid.UUID, string) {
	t.Helper()
	ctx := context.Background()

	var accountID uuid.UUID
	err := db.QueryRow(ctx, `
		INSERT INTO accounts (email, password_hash, name, role, status)
		VALUES ($1, 'x', 'API Key Middleware Account', 'owner', 'active')
		RETURNING id`,
		fmt.Sprintf("apikey-middleware-%s@example.test", uuid.New()),
	).Scan(&accountID)
	require.NoError(t, err)

	storeID := uuid.New()
	slug := fmt.Sprintf("apikey-store-%s", storeID)
	_, err = db.Exec(ctx, `
		INSERT INTO stores (id, account_id, name, slug, status)
		VALUES ($1, $2, 'Middleware Store', $3, 'active')`,
		storeID, accountID, slug,
	)
	require.NoError(t, err)
	return storeID, slug
}

func ping(t *testing.T, app *fiber.App, slug, authHeader string) *http.Response {
	t.Helper()
	req := httptest.NewRequest("GET", "/api/v1/"+slug+"/ping", nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := app.Test(req)
	require.NoError(t, err)
	return resp
}

func jsonDecode(resp *http.Response, v any) error {
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(v)
}

// TestRequireAPIKey covers the Bearer authentication matrix: every failure
// mode maps to 401 or 403 exactly as the spec dictates, and only a valid key
// bound to its own slug reaches the handler.
func TestRequireAPIKey(t *testing.T) {
	app, db, svc, storeA, slugA, _, otherSlug := setupAPIKeyMiddleware(t)

	plain, key, err := svc.Create(context.Background(), storeA, "Middleware key")
	require.NoError(t, err)

	t.Run("missing header", func(t *testing.T) {
		resp := ping(t, app, slugA, "")
		assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("malformed header without Bearer scheme", func(t *testing.T) {
		resp := ping(t, app, slugA, "Basic abc123")
		assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("unknown key", func(t *testing.T) {
		resp := ping(t, app, slugA, "Bearer gsk_0000000000000000000000000000000000000000")
		assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("revoked key", func(t *testing.T) {
		err := svc.Revoke(context.Background(), storeA, key.ID)
		require.NoError(t, err)
		resp := ping(t, app, slugA, "Bearer "+plain)
		assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("expired key", func(t *testing.T) {
		plain2, key2, err := svc.Create(context.Background(), storeA, "Expired mw key")
		require.NoError(t, err)
		_, err = db.Exec(context.Background(),
			`UPDATE store_api_keys SET expires_at = NOW() - interval '1 hour' WHERE id = $1`, key2.ID)
		require.NoError(t, err)
		resp := ping(t, app, slugA, "Bearer "+plain2)
		assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("inactive key", func(t *testing.T) {
		plain3, key3, err := svc.Create(context.Background(), storeA, "Inactive mw key")
		require.NoError(t, err)
		_, err = db.Exec(context.Background(),
			`UPDATE store_api_keys SET active = false WHERE id = $1`, key3.ID)
		require.NoError(t, err)
		resp := ping(t, app, slugA, "Bearer "+plain3)
		assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("key from another store", func(t *testing.T) {
		plain4, _, err := svc.Create(context.Background(), storeA, "Cross-store mw key")
		require.NoError(t, err)
		resp := ping(t, app, otherSlug, "Bearer "+plain4)
		assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	})

	t.Run("valid key bound to its slug reaches the handler with store_id", func(t *testing.T) {
		plain5, _, err := svc.Create(context.Background(), storeA, "Happy mw key")
		require.NoError(t, err)

		resp := ping(t, app, slugA, "Bearer "+plain5)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)

		var body map[string]any
		require.NoError(t, jsonDecode(resp, &body))
		assert.Equal(t, storeA.String(), body["store_id"], "handler must see the key's store_id in Locals")
	})
}

// TestRequireAPIKeyTouchLastUsed covers the throttled last_used_at update:
// writes happen only when the timestamp is NULL or older than an hour.
func TestRequireAPIKeyTouchLastUsed(t *testing.T) {
	app, db, svc, storeA, slugA, _, _ := setupAPIKeyMiddleware(t)

	t.Run("fresh key without last_used_at gets it set", func(t *testing.T) {
		plain, key, err := svc.Create(context.Background(), storeA, "Fresh key")
		require.NoError(t, err)

		resp := ping(t, app, slugA, "Bearer "+plain)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)

		var lastUsed *time.Time
		err = db.QueryRow(context.Background(),
			`SELECT last_used_at FROM store_api_keys WHERE id = $1`, key.ID,
		).Scan(&lastUsed)
		require.NoError(t, err)
		assert.NotNil(t, lastUsed, "last_used_at must be written on first authenticated use")
		assert.WithinDuration(t, time.Now(), *lastUsed, time.Minute)
	})

	t.Run("last_used_at younger than 1h is left untouched", func(t *testing.T) {
		plain, key, err := svc.Create(context.Background(), storeA, "Warm key")
		require.NoError(t, err)
		tenMinAgo := time.Now().Add(-10 * time.Minute)
		_, err = db.Exec(context.Background(),
			`UPDATE store_api_keys SET last_used_at = $2 WHERE id = $1`, key.ID, tenMinAgo)
		require.NoError(t, err)

		resp := ping(t, app, slugA, "Bearer "+plain)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)

		var lastUsed time.Time
		err = db.QueryRow(context.Background(),
			`SELECT last_used_at FROM store_api_keys WHERE id = $1`, key.ID,
		).Scan(&lastUsed)
		require.NoError(t, err)
		assert.WithinDuration(t, tenMinAgo, lastUsed, time.Minute,
			"last_used_at must not be refreshed within the 1h throttle window")
	})

	t.Run("last_used_at older than 1h is refreshed", func(t *testing.T) {
		plain, key, err := svc.Create(context.Background(), storeA, "Stale key")
		require.NoError(t, err)
		twoHoursAgo := time.Now().Add(-2 * time.Hour)
		_, err = db.Exec(context.Background(),
			`UPDATE store_api_keys SET last_used_at = $2 WHERE id = $1`, key.ID, twoHoursAgo)
		require.NoError(t, err)

		resp := ping(t, app, slugA, "Bearer "+plain)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)

		var lastUsed time.Time
		err = db.QueryRow(context.Background(),
			`SELECT last_used_at FROM store_api_keys WHERE id = $1`, key.ID,
		).Scan(&lastUsed)
		require.NoError(t, err)
		assert.Greater(t, lastUsed.Sub(twoHoursAgo), time.Hour,
			"last_used_at must be refreshed when stale by more than 1h")
		assert.WithinDuration(t, time.Now(), lastUsed, time.Minute)
	})
}
