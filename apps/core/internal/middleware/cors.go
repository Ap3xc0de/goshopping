package middleware

import (
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/goshopping/core/internal/config"
)

// CORS returns a Fiber CORS middleware. Origins are resolved in this order:
//  1. CORS_ORIGINS env var (comma-separated list, or "*")
//  2. "*" when APP_ENV == "development"
//  3. Production domains otherwise
func CORS(cfg *config.Config) fiber.Handler {
	allowOrigins := os.Getenv("CORS_ORIGINS")
	if allowOrigins == "" {
		if cfg.AppEnv != "development" {
			allowOrigins = "https://admin.goshopping.co,https://superadmin.goshopping.co"
		} else {
			allowOrigins = "*"
		}
	}

	return cors.New(cors.Config{
		AllowOrigins: allowOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
	})
}
