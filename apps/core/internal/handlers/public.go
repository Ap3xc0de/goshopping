package handlers

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PublicProduct is the public-facing product (no cost field).
type PublicProduct struct {
	ID             uuid.UUID    `json:"id"`
	StoreID        uuid.UUID    `json:"store_id"`
	Name           string       `json:"name"`
	SKU            string       `json:"sku"`
	Description    string       `json:"description"`
	Price          models.Money `json:"price"`
	EffectivePrice models.Money `json:"effective_price"`
	ActiveOffer    *PublicOffer `json:"active_offer"`
	Stock          int          `json:"stock"`
	Category       string       `json:"category"`
	Images         interface{}  `json:"images"`
	Status         string       `json:"status"`
}

// PublicOffer is the reduced, public-facing view of the offer currently
// applied to a product (see ResolveOffer). It never exposes store_id or
// other internal offer fields (scope, scope_value, status, timestamps).
type PublicOffer struct {
	ID            uuid.UUID    `json:"id"`
	Name          string       `json:"name"`
	DiscountType  string       `json:"discount_type"`
	DiscountValue models.Money `json:"discount_value"`
	EndsAt        *time.Time   `json:"ends_at,omitempty"`
}

// PublicListProducts handles GET /public/:storeSlug/products
func PublicListProducts(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		slug := c.Params("storeSlug")
		storeID, err := resolveStoreBySlug(c.Context(), db, slug)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		eventSvc := services.NewEventService(cfg)
		prodSvc := services.NewProductService(db, cfg, eventSvc)
		offerSvc := services.NewOfferService(db)

		result, err := prodSvc.ListProducts(storeID, 1, 50, c.Query("category"), "active", c.Query("search"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		// Load active offers once per request and resolve in memory for every
		// product below, instead of querying offers per product (avoids N+1).
		activeOffers, err := offerSvc.ListActiveOffers(c.Context(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		now := time.Now()

		public := make([]PublicProduct, len(result.Products))
		for i, p := range result.Products {
			public[i] = toPublicProduct(p, activeOffers, now)
		}
		return c.JSON(fiber.Map{
			"data":        public,
			"total":       result.Total,
			"page":        result.Page,
			"per_page":    result.PerPage,
			"total_pages": result.TotalPages,
		})
	}
}

// PublicGetProduct handles GET /public/:storeSlug/products/:productId
func PublicGetProduct(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		slug := c.Params("storeSlug")
		storeID, err := resolveStoreBySlug(c.Context(), db, slug)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		productID, err := uuid.Parse(c.Params("productId"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid product_id")
		}

		eventSvc := services.NewEventService(cfg)
		prodSvc := services.NewProductService(db, cfg, eventSvc)
		offerSvc := services.NewOfferService(db)

		p, err := prodSvc.GetProduct(storeID, productID)
		if err != nil {
			if errors.Is(err, services.ErrProductNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "product not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		activeOffers, err := offerSvc.ListActiveOffers(c.Context(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.JSON(toPublicProduct(*p, activeOffers, time.Now()))
	}
}

// PublicCreateOrder handles POST /public/:storeSlug/orders
func PublicCreateOrder(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		slug := c.Params("storeSlug")
		storeID, err := resolveStoreBySlug(c.Context(), db, slug)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		var req models.CreateOrderInput
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		if len(req.Items) == 0 {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "items are required")
		}

		eventSvc := services.NewEventService(cfg)
		prodSvc := services.NewProductService(db, cfg, eventSvc)
		custSvc := services.NewCustomerService(db, cfg)
		orderSvc := services.NewOrderService(db, cfg, eventSvc, custSvc, prodSvc)

		order, err := orderSvc.CreateOrder(storeID, req, nil)
		if err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}

		// Generate a short-lived access token for order status checks
		accessToken, err := generateOrderAccessToken(order.Order.ID, cfg.JWTSecret)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "could not generate access token")
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"order":        order,
			"access_token": accessToken,
		})
	}
}

// PublicOrderStatus handles GET /public/orders/:orderId/status
func PublicOrderStatus(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := c.Query("token")
		if tokenStr == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "token required")
		}

		orderID, err := validateOrderAccessToken(tokenStr, cfg.JWTSecret)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		}

		paramID, err := uuid.Parse(c.Params("orderId"))
		if err != nil || paramID != orderID {
			return fiber.NewError(fiber.StatusForbidden, "token does not match order")
		}

		eventSvc := services.NewEventService(cfg)
		prodSvc := services.NewProductService(db, cfg, eventSvc)
		custSvc := services.NewCustomerService(db, cfg)
		orderSvc := services.NewOrderService(db, cfg, eventSvc, custSvc, prodSvc)

		order, err := orderSvc.GetOrderByIDOnly(orderID)
		if err != nil {
			if errors.Is(err, services.ErrOrderNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "order not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.JSON(fiber.Map{
			"id":       order.Order.ID,
			"status":   order.Order.Status,
			"total":    order.Order.Total,
			"timeline": order.Timeline,
		})
	}
}

// PublicStoreConfig handles GET /public/:storeSlug/config
func PublicStoreConfig(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		slug := c.Params("storeSlug")
		ctx := c.Context()

		var store struct {
			ID       uuid.UUID             `json:"id"`
			Name     string                `json:"name"`
			Slug     string                `json:"slug"`
			Status   string                `json:"status"`
			Branding *models.StoreBranding `json:"branding"`
		}
		if err := db.QueryRow(ctx, `
			SELECT id, name, slug, status FROM stores WHERE slug = $1 AND status = 'active'`, slug,
		).Scan(&store.ID, &store.Name, &store.Slug, &store.Status); err != nil {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		brandingSvc := services.NewBrandingService(db, cfg)
		branding, err := brandingSvc.GetBranding(ctx, store.ID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		store.Branding = branding

		return c.JSON(store)
	}
}

func resolveStoreBySlug(ctx context.Context, db *pgxpool.Pool, slug string) (uuid.UUID, error) {
	var id uuid.UUID
	if err := db.QueryRow(ctx, `
		SELECT id FROM stores WHERE slug = $1 AND status = 'active'`, slug,
	).Scan(&id); err != nil {
		return uuid.Nil, fmt.Errorf("store not found: %w", err)
	}
	return id, nil
}

// toPublicProduct maps a Product plus the store's already-loaded active
// offers into a PublicProduct, resolving the single applicable offer (if
// any) in memory via services.ResolveOffer — no DB access happens here.
func toPublicProduct(p models.Product, activeOffers []models.Offer, now time.Time) PublicProduct {
	offer := services.ResolveOffer(activeOffers, p.ID, p.Category, p.Price, now)
	effectivePrice := services.ApplyOffer(p.Price, offer)

	var publicOffer *PublicOffer
	if offer != nil {
		publicOffer = &PublicOffer{
			ID:            offer.ID,
			Name:          offer.Name,
			DiscountType:  offer.DiscountType,
			DiscountValue: offer.DiscountValue,
			EndsAt:        offer.EndsAt,
		}
	}

	return PublicProduct{
		ID:             p.ID,
		StoreID:        p.StoreID,
		Name:           p.Name,
		SKU:            p.SKU,
		Description:    p.Description,
		Price:          p.Price,
		EffectivePrice: effectivePrice,
		ActiveOffer:    publicOffer,
		Stock:          p.Stock,
		Category:       p.Category,
		Images:         p.Images,
		Status:         p.Status,
	}
}

func generateOrderAccessToken(orderID uuid.UUID, secret string) (string, error) {
	claims := jwt.MapClaims{
		"order_id":   orderID.String(),
		"token_type": "order_access",
		"exp":        time.Now().Add(30 * 24 * time.Hour).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func validateOrderAccessToken(tokenStr, secret string) (uuid.UUID, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return uuid.Nil, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, fmt.Errorf("invalid claims")
	}
	orderIDStr, _ := claims["order_id"].(string)
	return uuid.Parse(orderIDStr)
}
