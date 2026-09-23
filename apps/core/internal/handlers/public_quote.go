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
	"github.com/shopspring/decimal"
)

// QuoteCartInput is the DTO for quote request. ShippingMethod is a shipping
// method code (optional): present → shipping_total is computed and folded
// into total; omitted → shipping_total 0, unchanged from before this change
// (shipping-zones REQ: Quote Carrier Cost).
type QuoteCartInput struct {
	Items          []QuoteItemInput `json:"items"`
	CouponCode     *string          `json:"coupon_code,omitempty"`
	ShippingMethod string           `json:"shipping_method,omitempty"`
}

// QuoteItemInput is a line item in the quote request. VariantID is optional:
// when present, price and stock checks use that variant; omitted keeps
// product-level behavior (product-variants REQ: Variant-Aware Quote).
type QuoteItemInput struct {
	ProductID string `json:"product_id"`
	VariantID string `json:"variant_id"`
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
		variantSvc := services.NewVariantService(db)

		ctx := context.Background()

		// ── Stage 1: Resolve products and build line items
		var lineItems []services.LineItem
		var products []*models.Product
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
			products = append(products, p)

			// Variant pre-stage (product-variants REQ): variant_id present →
			// resolve that variant (must belong to this product, active) and
			// price + stock-check against it; omitted → product-level
			// behavior, old quote payloads keep working unchanged.
			listPrice := p.Price
			if inp.VariantID != "" {
				variantID, err := uuid.Parse(inp.VariantID)
				if err != nil {
					return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
						"error": "invalid variant_id",
					})
				}
				variant, err := variantSvc.GetActiveVariantForProduct(ctx, storeID, variantID, pid)
				if err != nil {
					return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
						"error": "variant not found for product " + p.Name,
					})
				}
				if variant.Stock < inp.Quantity {
					return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
						"error": "insufficient stock for " + p.Name,
					})
				}
				listPrice = variant.ResolvePrice(p.Price)
			} else if p.Stock < inp.Quantity {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
					"error": "insufficient stock for " + p.Name,
				})
			}

			lineItems = append(lineItems, services.LineItem{
				ProductID: p.ID,
				Quantity:  inp.Quantity,
				ListPrice: listPrice,
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

		// ── Stage 2.5: Resolve shipping (pre-stage; pure formula fed by a
		// DB-resolved method + already-known product weights) — never trust a
		// client-provided shipping_total (shipping-zones REQ: Quote Carrier Cost).
		shippingTotal := models.MoneyZero()
		if req.ShippingMethod != "" {
			method, err := services.NewShippingService(db).GetActiveMethodByCode(ctx, storeID, req.ShippingMethod)
			if err != nil {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
					"error": "unknown or inactive shipping_method",
				})
			}
			weightTotal := 0.0
			for i, li := range lineItems {
				weightTotal += products[i].Weight * float64(li.Quantity)
			}
			shippingTotal = method.BasePrice.Add(method.WeightRate.Mul(decimal.NewFromFloat(weightTotal))).Round2()
		}

		// ── Stage 3: Compute quote (pure, no DB)
		now := time.Now()
		preview, err := services.ComputeQuote(lineItems, offers, coupon, shippingTotal, now)
		if err != nil {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{
				"error": err.Error(),
			})
		}

		return c.JSON(preview)
	}
}
