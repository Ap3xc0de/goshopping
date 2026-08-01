package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/goshopping/core/internal/config"
)

const productionOrigins = "https://admin.goshopping.co,https://superadmin.goshopping.co"

// CORS returns a Fiber CORS middleware. Origins are resolved in this order:
//  1. CORS_ORIGINS env var (comma-separated list) — "*" only allowed in development
//  2. "*" when APP_ENV == "development"
//  3. Production allowlist otherwise
func CORS(cfg *config.Config) fiber.Handler {
	allowOrigins := strings.TrimSpace(os.Getenv("CORS_ORIGINS"))

	if cfg.AppEnv != "development" {
		// Fail closed: never allow wildcard outside development.
		if allowOrigins == "" || allowOrigins == "*" || strings.Contains(allowOrigins, "*") {
			allowOrigins = productionOrigins
		}
	} else if allowOrigins == "" {
		allowOrigins = "*"
	}

	return cors.New(cors.Config{
		AllowOrigins: allowOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
	})
}
