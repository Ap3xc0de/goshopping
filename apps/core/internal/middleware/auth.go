package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	keyAccountID = "account_id"
	keyRole      = "role"
	keyStores    = "stores"
)

// Auth returns a middleware that validates the Bearer JWT and injects claims
// into the Fiber context.
func Auth(jwtSecret string) fiber.Handler {
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

		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid token claims",
			})
		}

		// Verify token_type == "access"
		if tokenType, _ := claims["token_type"].(string); tokenType != "access" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid token type",
			})
		}

		c.Locals(keyAccountID, claims["sub"])
		c.Locals(keyRole, claims["role"])
		c.Locals(keyStores, claims["stores"])

		return c.Next()
	}
}

// RequireSuperAdmin returns a middleware that allows only superadmin accounts.
func RequireSuperAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if GetRole(c) != "superadmin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "superadmin access required",
			})
		}
		return c.Next()
	}
}

// GetAccountID extracts the account UUID from the Fiber context.
// Returns uuid.Nil when not present.
func GetAccountID(c *fiber.Ctx) uuid.UUID {
	raw, _ := c.Locals(keyAccountID).(string)
	id, _ := uuid.Parse(raw)
	return id
}

// GetRole extracts the role string from the Fiber context.
func GetRole(c *fiber.Ctx) string {
	role, _ := c.Locals(keyRole).(string)
	return role
}

// IsSuperAdmin returns true when the authenticated account has role superadmin.
func IsSuperAdmin(c *fiber.Ctx) bool {
	return GetRole(c) == "superadmin"
}
