package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/catalog"
	"github.com/goshopping/core/internal/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UpdateStoreTemplate handles PUT /stores/:storeId/template.
//
// template_id has no FK to a templates table — templates are code, not data
// (libs/template-catalog), so validation happens here against the catalog
// loaded once at process startup (REQ-CATALOG-04). Any id the catalog does
// not know about, including an empty string, is rejected with 422 before it
// ever reaches the database.
func UpdateStoreTemplate(db *pgxpool.Pool, cat *catalog.Catalog) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		var req struct {
			TemplateID string `json:"template_id"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}

		if !cat.IsValid(req.TemplateID) {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "unknown template_id")
		}

		tag, err := db.Exec(c.Context(), `
			UPDATE stores SET template_id = $1, updated_at = NOW() WHERE id = $2`,
			req.TemplateID, storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		if tag.RowsAffected() == 0 {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		return c.JSON(fiber.Map{"template_id": req.TemplateID})
	}
}
