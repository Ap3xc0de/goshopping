package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// storeInfo is the seller-safe view of a store: the fields an owner needs to
// build public-API URLs (id, name, slug) and nothing more.
type storeInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// GetStore handles GET /stores/:storeId. It returns the owner's own store
// basic info including its slug, which the admin "Mi Tienda" developer hub
// uses to build /api/v1/:slug URLs. The store id comes from StoreContext
// (already authorized), never from the request body, so an owner cannot read
// another tenant's store.
func GetStore(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		var name, slug string
		err := db.QueryRow(c.Context(), `
			SELECT name, slug
			FROM stores
			WHERE id = $1`,
			storeID,
		).Scan(&name, &slug)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "store not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, "could not read store")
		}

		return c.JSON(storeInfo{ID: storeID.String(), Name: name, Slug: slug})
	}
}
