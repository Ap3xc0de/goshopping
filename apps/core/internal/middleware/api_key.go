package middleware

import (
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/services"
)

// apiKeyTouchInterval is the minimum age of last_used_at that triggers a
// touch write (see ADR-7): anything fresher skips the UPDATE so the hot path
// does not write per request.
const apiKeyTouchInterval = time.Hour

// RequireAPIKey returns a middleware that authenticates requests with a
// storefront developer key ("Authorization: Bearer <key>") and injects the
// key's store_id into the context. Failure mapping follows the spec matrix:
// missing/malformed/unknown/revoked/expired/inactive keys are 401, a valid
// key presented against another store's slug is 403.
func RequireAPIKey(apiKeySvc *services.APIKeyService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing authorization header",
			})
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "malformed authorization header",
			})
		}

		key, err := apiKeySvc.ValidateToken(c.Context(), parts[1], c.Params("storeSlug"))
		if err != nil {
			if errors.Is(err, services.ErrAPIKeyStoreMismatch) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "api key does not belong to this store",
				})
			}
			if errors.Is(err, services.ErrAPIKeyInvalid) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "invalid api key",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "could not validate api key",
			})
		}

		now := time.Now()
		if key.LastUsedAt == nil || now.Sub(*key.LastUsedAt) > apiKeyTouchInterval {
			// Best-effort: a tracking write failure must not fail the request.
			_ = apiKeySvc.TouchLastUsed(c.Context(), key.ID, now)
		}

		c.Locals(keyStoreID, key.StoreID)
		return c.Next()
	}
}
