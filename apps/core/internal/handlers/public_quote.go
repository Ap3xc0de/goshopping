package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

// QuoteCartInput is the DTO for quote request.
type QuoteCartInput struct {
	Items      []QuoteItemInput `json:"items"`
	CouponCode *string          `json:"coupon_code,omitempty"`
}

// QuoteItemInput is a line item in the quote request.
type QuoteItemInput struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

// QuoteCart computes and returns a cart preview without persisting.
func QuoteCart(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeSlug := c.Params("storeSlug")

		// Resolve store by slug
		var storeID uuid.UUID
		err := db.QueryRow(context.Background(), `SELECT id FROM stores WHERE slug = $1`, storeSlug).Scan(&storeID)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(map[string]string{"error": "store not found"})
		}

		var req QuoteCartInput
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(map[string]string{"error": "invalid request"})
		}

		if len(req.Items) == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(map[string]string{"error": "at least one item is required"})
		}

		// Initialize services
		prodSvc := services.NewProductService(db, cfg, nil)
		offerSvc := services.NewOfferService(db)
		couponSvc := services.NewCouponService(db)

		ctx := context.Background()

		// ── Stage 1: Resolve products and build line items
		var lineItems []services.LineItem
		for _, inp := range req.Items {
			if inp.Quantity <= 0 {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
					"error": "quantity must be > 0",
				})
			}

			pid, err := uuid.Parse(inp.ProductID)
			if err != nil {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
					"error": "invalid product_id",
				})
			}

			p, err := prodSvc.GetProduct(storeID, pid)
			if err != nil {
				return c.Status(fiber.StatusNotFound).JSON(map[string]string{
					"error": "product not found",
				})
			}

			if p.Stock < inp.Quantity {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
					"error": "insufficient stock for " + p.Name,
				})
			}

			lineItems = append(lineItems, services.LineItem{
				ProductID: p.ID,
				Quantity:  inp.Quantity,
				ListPrice: p.Price,
				Category:  p.Category,
			})
		}

		// ── Stage 2: Load active offers and resolve coupon
		offers, err := offerSvc.ListActiveOffers(ctx, storeID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(map[string]string{"error": "failed to load offers"})
		}

		var coupon *models.Coupon
		if req.CouponCode != nil && *req.CouponCode != "" {
			retrievedCoupon, err := couponSvc.GetCouponByCode(ctx, storeID, *req.CouponCode)
			if err != nil {
				return c.Status(fiber.StatusNotFound).JSON(map[string]string{
					"error": "coupon not found",
				})
			}
			coupon = retrievedCoupon
		}

		// ── Stage 3: Compute quote (pure, no DB)
		now := time.Now()
		preview, err := services.ComputeQuote(lineItems, offers, coupon, now)
		if err != nil {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
				"error": err.Error(),
			})
		}

		return c.JSON(preview)
	}
}
