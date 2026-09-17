package middleware_test

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newOriginSecretTestApp wires RequireOriginSecret in front of a single ping
// route, mirroring how router.go applies it to the "pub" group.
func newOriginSecretTestApp(current, previous string) *fiber.App {
	app := fiber.New()
	app.Use(middleware.RequireOriginSecret(current, previous))
	app.Get("/public/ping", func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})
	return app
}

// TestRequireOriginSecret covers REQ-INFRA-04 / RESOLVE-06: the origin only
// trusts requests carrying the shared secret Cloudflare injects via a
// Transform Rule. See decisions-infra (#1098 rev.2): this is the ONLY
// defense layer for v1 — the ALB security group stays open to 0.0.0.0/0.
func TestRequireOriginSecret(t *testing.T) {
	t.Run("blocks when header missing and a secret is configured", func(t *testing.T) {
		app := newOriginSecretTestApp("current-secret", "")
		req := httptest.NewRequest("GET", "/public/ping", nil)

		resp, err := app.Test(req)

		require.NoError(t, err)
		assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	})

	t.Run("passes when header matches the current secret", func(t *testing.T) {
		app := newOriginSecretTestApp("current-secret", "")
		req := httptest.NewRequest("GET", "/public/ping", nil)
		req.Header.Set("X-Origin-Shared-Secret", "current-secret")

		resp, err := app.Test(req)

		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	})

	t.Run("passes when header matches the previous secret during rotation", func(t *testing.T) {
		app := newOriginSecretTestApp("current-secret", "previous-secret")
		req := httptest.NewRequest("GET", "/public/ping", nil)
		req.Header.Set("X-Origin-Shared-Secret", "previous-secret")

		resp, err := app.Test(req)

		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	})

	t.Run("blocks when header does not match any configured secret", func(t *testing.T) {
		app := newOriginSecretTestApp("current-secret", "previous-secret")
		req := httptest.NewRequest("GET", "/public/ping", nil)
		req.Header.Set("X-Origin-Shared-Secret", "wrong-secret")

		resp, err := app.Test(req)

		require.NoError(t, err)
		assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	})

	t.Run("does not block when no secret is configured (local development)", func(t *testing.T) {
		app := newOriginSecretTestApp("", "")
		req := httptest.NewRequest("GET", "/public/ping", nil)

		resp, err := app.Test(req)

		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	})
}
