package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

// normalizeHost canonicalizes a request host into the form persisted in
// store_domains.hostname: lowercase, no port, no trailing dot, no "www."
// prefix. Defense in depth — it does not assume the caller already
// normalized the host (REQ-RESOLVE-02).
func normalizeHost(raw string) string {
	h := strings.ToLower(raw)
	if i := strings.IndexByte(h, ':'); i != -1 {
		h = h[:i]
	}
	h = strings.TrimSuffix(h, ".")
	h = strings.TrimPrefix(h, "www.")
	return h
}

// PublicProduct is the public-facing product (no cost field). Variants embeds
// the product's purchasable variants (always an array, never null — additive
// evolution per product-variants spec).
type PublicProduct struct {
	ID             uuid.UUID       `json:"id"`
	StoreID        uuid.UUID       `json:"store_id"`
	Name           string          `json:"name"`
	SKU            string          `json:"sku"`
	Description    string          `json:"description"`
	Price          models.Money    `json:"price"`
	EffectivePrice models.Money    `json:"effective_price"`
	ActiveOffer    *PublicOffer    `json:"active_offer"`
	Stock          int             `json:"stock"`
	Category       string          `json:"category"`
	Images         interface{}     `json:"images"`
	Status         string          `json:"status"`
	Variants       []PublicVariant `json:"variants"`
}

// PublicVariant is the public-facing variant view. Price is resolved server-
// side (price_override when set, else the product price) so clients never do
// fallback math themselves.
type PublicVariant struct {
	ID     uuid.UUID    `json:"id"`
	SKU    string       `json:"sku"`
	Size   string       `json:"size"`
	Color  string       `json:"color"`
	Price  models.Money `json:"price"`
	Stock  int          `json:"stock"`
	Status string       `json:"status"`
}

// toPublicVariant maps a stored variant into its public shape, resolving the
// effective per-variant price via the product-level fallback.
func toPublicVariant(v models.ProductVariant, productPrice models.Money) PublicVariant {
	return PublicVariant{
		ID:     v.ID,
		SKU:    v.SKU,
		Size:   v.Size,
		Color:  v.Color,
		Price:  v.ResolvePrice(productPrice),
		Stock:  v.Stock,
		Status: v.Status,
	}
}

// toPublicVariants maps a product's stored variants, guaranteeing the result
// is a JSON array (never null) so legacy clients see additive-only change.
func toPublicVariants(variants []models.ProductVariant, productPrice models.Money) []PublicVariant {
	public := make([]PublicVariant, 0, len(variants))
	for _, v := range variants {
		public = append(public, toPublicVariant(v, productPrice))
	}
	return public
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

		page, perPage := parsePublicPagination(c.Query("page", "1"), c.Query("per_page", "24"))

		result, err := prodSvc.ListProducts(storeID, page, perPage, c.Query("category"), "active", c.Query("search"), c.Query("sort"))
		if err != nil {
			if errors.Is(err, services.ErrInvalidSort) {
				return fiber.NewError(fiber.StatusBadRequest, err.Error())
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		// Load active offers once per request and resolve in memory for every
		// product below, instead of querying offers per product (avoids N+1).
		activeOffers, err := offerSvc.ListActiveOffers(c.Context(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		now := time.Now()

		// Batch-load active variants for every listed product in ONE query
		// (product-variants REQ: variants[] on the list path, no N+1).
		variantsByProduct, err := loadVariantsByProducts(c, db, storeID, result.Products)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		public := make([]PublicProduct, len(result.Products))
		for i, p := range result.Products {
			public[i] = toPublicProduct(p, variantsByProduct[p.ID], activeOffers, now)
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

// PublicCategory is the public-facing category tree node: category fields plus
// the real active product count and nested children.
type PublicCategory struct {
	ID           uuid.UUID        `json:"id"`
	Name         string           `json:"name"`
	Slug         string           `json:"slug"`
	ProductCount int              `json:"product_count"`
	Children     []PublicCategory `json:"children"`
}

// toPublicCategory maps a services.CategoryNode tree into the public shape,
// guaranteeing children is always a JSON array (never null).
func toPublicCategory(n models.CategoryNode) PublicCategory {
	children := make([]PublicCategory, 0, len(n.Children))
	for _, ch := range n.Children {
		children = append(children, toPublicCategory(ch))
	}
	return PublicCategory{
		ID:           n.ID,
		Name:         n.Name,
		Slug:         n.Slug,
		ProductCount: n.ProductCount,
		Children:     children,
	}
}

// PublicListCategories handles GET /public/:storeSlug/categories — the
// hierarchical category tree with SQL-computed active product counts.
// Registered in both public route groups (/public and /api/v1).
func PublicListCategories(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		slug := c.Params("storeSlug")
		storeID, err := resolveStoreBySlug(c.Context(), db, slug)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		tree, err := services.NewCategoryService(db).ListCategoryTree(c.Context(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		public := make([]PublicCategory, 0, len(tree))
		for _, n := range tree {
			public = append(public, toPublicCategory(n))
		}
		return c.JSON(public)
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

		variantsByProduct, err := loadVariantsByProducts(c, db, storeID, []models.Product{*p})
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.JSON(toPublicProduct(*p, variantsByProduct[p.ID], activeOffers, time.Now()))
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
			"id":               order.Order.ID,
			"order_number":     order.Order.OrderNumber,
			"status":           order.Order.Status,
			"payment_status":   order.Order.PaymentStatus,
			"total":            order.Order.Total,
			"items":            order.Order.Items,
			"shipping_address": order.Order.ShippingAddress,
			"timeline":         order.Timeline,
		})
	}
}

// PublicStoreConfigResponse is the shape shared by GET /public/:storeSlug/config
// and GET /public/by-domain/:host/config — template_id is the only field this
// change adds to what the slug endpoint returned before it (REQ-RESOLVE-03).
// Both endpoints MUST build their response through buildPublicStoreConfig so
// their shape can never diverge.
type PublicStoreConfigResponse struct {
	ID         uuid.UUID             `json:"id"`
	Name       string                `json:"name"`
	Slug       string                `json:"slug"`
	Status     string                `json:"status"`
	Branding   *models.StoreBranding `json:"branding"`
	TemplateID string                `json:"template_id"`
}

// errPublicStoreNotFound distinguishes "no active store matched storeID" from
// any other failure inside buildPublicStoreConfig (e.g. a branding read
// error), so callers can still map the two to different HTTP statuses like
// the pre-refactor single-query handler did (404 vs 500).
var errPublicStoreNotFound = errors.New("store not found")

// buildPublicStoreConfig loads the public-facing config for an already-resolved
// storeID. It re-checks status = 'active' itself (defense in depth) so it never
// returns data for a store that became inactive between resolution and this call.
func buildPublicStoreConfig(ctx context.Context, db *pgxpool.Pool, cfg *config.Config, storeID uuid.UUID) (*PublicStoreConfigResponse, error) {
	var resp PublicStoreConfigResponse
	if err := db.QueryRow(ctx, `
		SELECT id, name, slug, status, template_id FROM stores WHERE id = $1 AND status = 'active'`, storeID,
	).Scan(&resp.ID, &resp.Name, &resp.Slug, &resp.Status, &resp.TemplateID); err != nil {
		return nil, errPublicStoreNotFound
	}

	brandingSvc := services.NewBrandingService(db, cfg)
	branding, err := brandingSvc.GetBranding(ctx, resp.ID)
	if err != nil {
		return nil, err
	}
	resp.Branding = branding
	return &resp, nil
}

// PublicStoreConfig handles GET /public/:storeSlug/config
func PublicStoreConfig(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		slug := c.Params("storeSlug")
		storeID, err := resolveStoreBySlug(c.Context(), db, slug)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		resp, err := buildPublicStoreConfig(c.Context(), db, cfg, storeID)
		if err != nil {
			if errors.Is(err, errPublicStoreNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "store not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(resp)
	}
}

// PublicConfigByDomain handles GET /public/by-domain/:host/config. It must be
// registered in the "pub" router group, before the authenticated group — an
// unknown host has to 404, never fall through to the auth middleware's 401
// (REQ-RESOLVE-01).
func PublicConfigByDomain(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		host := normalizeHost(c.Params("host"))
		ctx := c.Context()

		var storeID uuid.UUID
		var lastStoreUpdate, lastDomainUpdate time.Time
		if err := db.QueryRow(ctx, `
			SELECT s.id, s.updated_at, d.updated_at
			FROM store_domains d JOIN stores s ON s.id = d.store_id
			WHERE d.hostname = $1 AND s.status = 'active'`, host,
		).Scan(&storeID, &lastStoreUpdate, &lastDomainUpdate); err != nil {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		resp, err := buildPublicStoreConfig(ctx, db, cfg, storeID)
		if err != nil {
			if errors.Is(err, errPublicStoreNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "store not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		etag := computeETag(storeID, lastStoreUpdate, lastDomainUpdate)
		c.Set("Cache-Control", "public, max-age=60")
		c.Set("ETag", etag)
		if c.Get("If-None-Match") == etag {
			return c.SendStatus(fiber.StatusNotModified)
		}
		return c.JSON(resp)
	}
}

// computeETag derives an opaque, quoted ETag from storeID plus the most
// recent updated_at across stores and store_domains. Branding is persisted as
// a subdocument under stores.config (see StoreBranding's doc comment), so a
// branding change already bumps stores.updated_at — no third timestamp needed
// (REQ-RESOLVE-04).
func computeETag(storeID uuid.UUID, lastStoreUpdate, lastDomainUpdate time.Time) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%d|%d", storeID, lastStoreUpdate.UnixNano(), lastDomainUpdate.UnixNano())))
	return `"` + hex.EncodeToString(sum[:]) + `"`
}

// parsePublicPagination mirrors the admin ListProducts handler's page/per_page
// parsing (see product.go's ListProducts), but with public-safe bounds:
// default page=1, default per_page=24, per_page clamped to [1,100], page
// clamped to >=1. Invalid/non-numeric input silently falls back to defaults
// instead of returning a 400 — this is a public, unauthenticated endpoint.
func parsePublicPagination(pageRaw, perPageRaw string) (page, perPage int) {
	page, err := strconv.Atoi(pageRaw)
	if err != nil || page < 1 {
		page = 1
	}
	perPage, err = strconv.Atoi(perPageRaw)
	if err != nil || perPage < 1 {
		perPage = 24
	}
	if perPage > 100 {
		perPage = 100
	}
	return page, perPage
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
// variants must already be loaded (batch-loaded by the caller) so the
// mapping stays pure.
func toPublicProduct(p models.Product, variants []models.ProductVariant, activeOffers []models.Offer, now time.Time) PublicProduct {
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
		Variants:       toPublicVariants(variants, p.Price),
	}
}

// loadVariantsByProducts batch-loads active variants for the given products
// in a single query (no N+1) and returns the productID-indexed result.
func loadVariantsByProducts(c *fiber.Ctx, db *pgxpool.Pool, storeID uuid.UUID, products []models.Product) (map[uuid.UUID][]models.ProductVariant, error) {
	ids := make([]uuid.UUID, len(products))
	for i, p := range products {
		ids[i] = p.ID
	}
	return services.NewVariantService(db).ListVariantsByProductIDs(c.Context(), storeID, ids, "active")
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
