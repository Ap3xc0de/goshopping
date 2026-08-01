package middleware

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const keyStoreID = "store_id"
const keyStoreRole = "store_role"

// StoreContext returns a middleware that verifies the authenticated account has
// access to the :storeId param, then injects the store UUID and role into context.
// Superadmins bypass the access check and may access any store as owner.
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
			c.Locals(keyStoreRole, "owner")
			return c.Next()
		}

		accountID := GetAccountID(c)
		if accountID == uuid.Nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authentication required",
			})
		}

		var role string
		err = db.QueryRow(
			context.Background(),
			`SELECT role FROM store_users WHERE store_id = $1 AND account_id = $2`,
			storeID, accountID,
		).Scan(&role)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "access denied to this store",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "could not verify store access",
			})
		}

		c.Locals(keyStoreID, storeID)
		c.Locals(keyStoreRole, role)
		return c.Next()
	}
}

// GetStoreID extracts the store UUID from the Fiber context.
func GetStoreID(c *fiber.Ctx) uuid.UUID {
	id, _ := c.Locals(keyStoreID).(uuid.UUID)
	return id
}

// GetStoreRole extracts the store-scoped role from the Fiber context.
func GetStoreRole(c *fiber.Ctx) string {
	role, _ := c.Locals(keyStoreRole).(string)
	return role
}

// RequireStoreRoles returns a middleware that allows only the listed store roles.
// Superadmins bypass the check.
func RequireStoreRoles(roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		if IsSuperAdmin(c) {
			return c.Next()
		}
		if _, ok := allowed[GetStoreRole(c)]; !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient store role",
			})
		}
		return c.Next()
	}
}
