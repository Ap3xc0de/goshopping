package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// storeDomain is the tenant-facing view of a row in store_domains. It leaves
// out cloudflare_hostname_id, which is operational detail the store owner has
// no use for.
type storeDomain struct {
	Hostname  string `json:"hostname"`
	Kind      string `json:"kind"`
	Status    string `json:"status"`
	IsPrimary bool   `json:"is_primary"`
}

// GetStoreDomain handles GET /stores/:storeId/domain.
//
// It returns the store's primary hostname, which step 3 of the create-store
// wizard shows to the owner. The store id comes from StoreContext, never from
// the request body, so an owner cannot read another tenant's hostname.
func GetStoreDomain(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		var d storeDomain
		err := db.QueryRow(c.Context(), `
			SELECT hostname, kind, status, is_primary
			FROM store_domains
			WHERE store_id = $1
			ORDER BY is_primary DESC, created_at ASC
			LIMIT 1`,
			storeID,
		).Scan(&d.Hostname, &d.Kind, &d.Status, &d.IsPrimary)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "store has no domain")
			}
			return fiber.NewError(fiber.StatusInternalServerError, "could not read store domain")
		}

		return c.JSON(d)
	}
}
