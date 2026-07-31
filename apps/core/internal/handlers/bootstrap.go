package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/config"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type promoteSuperAdminRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// PromoteSuperAdmin handles POST /internal/promote-superadmin.
// TEMPORARY bootstrap-only endpoint, gated by X-Bootstrap-Token; remove after initial superadmin creation.
func PromoteSuperAdmin(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if cfg.BootstrapToken == "" || c.Get("X-Bootstrap-Token") != cfg.BootstrapToken {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
		}

		var req promoteSuperAdminRequest
		if err := c.BodyParser(&req); err != nil || req.Email == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
		}

		var id, email, role string
		err := db.QueryRow(context.Background(), `
			UPDATE accounts SET role='superadmin', updated_at=NOW()
			WHERE email=$1
			RETURNING id, email, role`,
			req.Email,
		).Scan(&id, &email, &role)
		if err != nil {
			if err == pgx.ErrNoRows {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "account not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not promote account"})
		}

		return c.JSON(fiber.Map{"id": id, "email": email, "role": role})
	}
}
