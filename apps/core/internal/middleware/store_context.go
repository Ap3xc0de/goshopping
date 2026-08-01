package middleware

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

const keyStoreID = "store_id"

// StoreContext returns a middleware that verifies the authenticated account has
// access to the :storeId param, then injects the store UUID into context.
// Superadmins bypass the access check and may access any store.
func StoreContext(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeIDStr := c.Params("storeId")
		storeID, err := uuid.Parse(storeIDStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid store_id format",
			})
		}

		// Superadmins can access any store without a store_user record.
		if IsSuperAdmin(c) {
			c.Locals(keyStoreID, storeID)
			return c.Next()
		}

		accountID := GetAccountID(c)
		if accountID == uuid.Nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authentication required",
			})
		}

		// Verify the account has a store_users record for an active store.
		var exists bool
		err = db.QueryRow(
			context.Background(),
			`SELECT EXISTS(
				SELECT 1 FROM store_users su
				JOIN stores s ON s.id = su.store_id
				WHERE su.store_id = $1 AND su.account_id = $2 AND s.status = 'active'
			)`,
			storeID, accountID,
		).Scan(&exists)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "could not verify store access",
			})
		}
		if !exists {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied to this store",
			})
		}

		c.Locals(keyStoreID, storeID)
		return c.Next()
	}
}

// GetStoreID extracts the store UUID from the Fiber context.
func GetStoreID(c *fiber.Ctx) uuid.UUID {
	id, _ := c.Locals(keyStoreID).(uuid.UUID)
	return id
}
