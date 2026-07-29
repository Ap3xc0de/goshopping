package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Health handles GET /health.
func Health(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if err := db.Ping(context.Background()); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":      "degraded",
				"db":          "unreachable",
				"version":     "1.0.0",
				"environment": cfg.AppEnv,
			})
		}

		return c.JSON(fiber.Map{
			"status":      "ok",
			"version":     "1.0.0",
			"environment": cfg.AppEnv,
		})
	}
}
