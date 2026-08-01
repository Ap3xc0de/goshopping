package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	keyAccountID = "account_id"
	keyRole      = "role"
	keyStores    = "stores"
)

// Auth returns a middleware that validates the Bearer JWT, checks the account
// is still active in the DB, and injects live role/claims into the Fiber context.
func Auth(jwtSecret string, db *pgxpool.Pool) fiber.Handler {
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

		if tokenType, _ := claims["token_type"].(string); tokenType != "access" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid token type",
			})
		}

		sub, _ := claims["sub"].(string)
		accountID, err := uuid.Parse(sub)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid token claims",
			})
		}

		var status, role string
		err = db.QueryRow(c.Context(),
			`SELECT status, role FROM accounts WHERE id = $1`, accountID,
		).Scan(&status, &role)
		if err != nil || status != "active" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "account is not active",
			})
		}

		c.Locals(keyAccountID, sub)
		c.Locals(keyRole, role) // prefer live DB role over JWT claim
		c.Locals(keyStores, claims["stores"])

		return c.Next()
	}
}

// RequireSuperAdmin allows only active superadmin accounts (role from DB via Auth).
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
