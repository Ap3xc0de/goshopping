package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/catalog"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/handlers"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Setup registers all routes on the Fiber app.
func Setup(app *fiber.App, cfg *config.Config, db *pgxpool.Pool, eventSvc *services.EventService, cat *catalog.Catalog) {
	// ── Services ─────────────────────────────────────────────────────────────
	authSvc := services.NewAuthService(db, cfg)
	prodSvc := services.NewProductService(db, cfg, eventSvc)
	custSvc := services.NewCustomerService(db, cfg)
	orderSvc := services.NewOrderService(db, cfg, eventSvc, custSvc, prodSvc)
	dashSvc := services.NewDashboardService(db, cfg)
	adminSvc := services.NewAdminService(db, cfg)
	brandingSvc := services.NewBrandingService(db, cfg)
	offerSvc := services.NewOfferService(db)
	couponSvc := services.NewCouponService(db)
	apiKeySvc := services.NewAPIKeyService(db)
	categorySvc := services.NewCategoryService(db)

	// ── Public routes (no auth) ───────────────────────────────────────────────
	app.Get("/health", handlers.Health(db, cfg))

	authGroup := app.Group("/auth")
	authGroup.Post("/register", handlers.Register(authSvc))
	authGroup.Post("/login", handlers.Login(authSvc))
	authGroup.Post("/refresh", handlers.Refresh(authSvc))

	// Public storefront (no auth, but origin-secret gated — see
	// middleware.RequireOriginSecret and decisions-infra #1098 rev.2)
	pub := app.Group("/public", middleware.RequireOriginSecret(
		cfg.OriginSharedSecretCurrent,
		cfg.OriginSharedSecretPrevious,
	))
	pub.Get("/by-domain/:host/config", handlers.PublicConfigByDomain(db, cfg))
	pub.Get("/:storeSlug/config", handlers.PublicStoreConfig(db, cfg))
	pub.Get("/:storeSlug/products", handlers.PublicListProducts(db, cfg))
	pub.Get("/:storeSlug/products/:productId", handlers.PublicGetProduct(db, cfg))
	pub.Get("/:storeSlug/categories", handlers.PublicListCategories(db, cfg))
	pub.Post("/:storeSlug/quote", handlers.QuoteCart(db, cfg))
	pub.Post("/:storeSlug/orders", handlers.PublicCreateOrder(db, cfg))
	pub.Get("/:storeSlug/orders/:orderId/status", handlers.PublicOrderStatus(db, cfg))

	// Developer API v1 — the same public handlers mounted under
	// /api/v1/:storeSlug, gated by a Bearer API key instead of the origin
	// secret. /public/* remains unchanged.
	v1 := app.Group("/api/v1/:storeSlug", middleware.RequireAPIKey(apiKeySvc))
	v1.Get("/config", handlers.PublicStoreConfig(db, cfg))
	v1.Get("/products", handlers.PublicListProducts(db, cfg))
	v1.Get("/products/:productId", handlers.PublicGetProduct(db, cfg))
	v1.Get("/categories", handlers.PublicListCategories(db, cfg))
	v1.Post("/quote", handlers.QuoteCart(db, cfg))
	v1.Post("/orders", handlers.PublicCreateOrder(db, cfg))
	v1.Get("/orders/:orderId/status", handlers.PublicOrderStatus(db, cfg))

	// ── Protected routes ──────────────────────────────────────────────────────
	api := app.Group("/", middleware.Auth(cfg.JWTSecret))

	// Store-scoped routes
	store := api.Group("/stores/:storeId", middleware.StoreContext(db))

	// Products
	store.Get("/products", handlers.ListProducts(prodSvc))
	store.Post("/products", handlers.CreateProduct(prodSvc))
	store.Post("/products/bulk-import", handlers.BulkImportProducts(prodSvc))
	store.Get("/products/:productId", handlers.GetProduct(prodSvc))
	store.Put("/products/:productId", handlers.UpdateProduct(prodSvc))
	store.Delete("/products/:productId", handlers.DeleteProduct(prodSvc))
	store.Post("/products/:productId/images", handlers.ProductImageUpload(prodSvc))

	// Categories
	store.Get("/categories", handlers.ListCategories(categorySvc))
	store.Post("/categories", handlers.CreateCategory(categorySvc))
	store.Put("/categories/:categoryId", handlers.UpdateCategory(categorySvc))
	store.Delete("/categories/:categoryId", handlers.DeleteCategory(categorySvc))

	// Orders
	store.Get("/orders", handlers.ListOrders(orderSvc))
	store.Post("/orders", handlers.CreateOrder(orderSvc))
	store.Get("/orders/export", handlers.ExportOrders(orderSvc))
	store.Get("/orders/:orderId", handlers.GetOrder(orderSvc))
	store.Patch("/orders/:orderId/status", handlers.ChangeOrderStatus(orderSvc))
	store.Post("/orders/:orderId/cancel", handlers.CancelOrder(orderSvc))

	// Customers
	store.Get("/customers", handlers.ListCustomers(custSvc))
	store.Post("/customers", handlers.CreateCustomer(custSvc))
	store.Get("/customers/:customerId", handlers.GetCustomer(custSvc))
	store.Put("/customers/:customerId", handlers.UpdateCustomer(custSvc))
	store.Get("/customers/:customerId/orders", handlers.CustomerOrders(custSvc))

	// Dashboard
	store.Get("/dashboard", handlers.GetDashboard(dashSvc))

	// Store info (seller-safe: id, name, slug) — feeds the admin "Mi Tienda"
	// developer hub for building /api/v1/:slug URLs.
	store.Get("/", handlers.GetStore(db))

	// Branding
	store.Get("/branding", handlers.GetBranding(brandingSvc))
	store.Put("/branding", handlers.UpdateBranding(brandingSvc))
	store.Post("/branding/logo", handlers.BrandingLogoUpload(brandingSvc))

	// Domain
	store.Get("/domain", handlers.GetStoreDomain(db))

	// Template
	store.Put("/template", handlers.UpdateStoreTemplate(db, cat))

	// Offers
	store.Get("/offers", handlers.ListOffers(offerSvc))
	store.Post("/offers", handlers.CreateOffer(offerSvc))
	store.Get("/offers/:offerId", handlers.GetOffer(offerSvc))
	store.Put("/offers/:offerId", handlers.UpdateOffer(offerSvc))
	store.Delete("/offers/:offerId", handlers.DeleteOffer(offerSvc))

	// Coupons
	store.Get("/coupons", handlers.ListCoupons(couponSvc))
	store.Post("/coupons", handlers.CreateCoupon(couponSvc))
	store.Get("/coupons/:couponId", handlers.GetCoupon(couponSvc))
	store.Put("/coupons/:couponId", handlers.UpdateCoupon(couponSvc))
	store.Delete("/coupons/:couponId", handlers.DeleteCoupon(couponSvc))

	// API keys
	store.Get("/api-keys", handlers.ListAPIKeys(apiKeySvc))
	store.Post("/api-keys", handlers.CreateAPIKey(apiKeySvc))
	store.Delete("/api-keys/:keyId", handlers.RevokeAPIKey(apiKeySvc))

	// Reports
	store.Get("/reports/sales", handlers.GetReportsSales(dashSvc))
	store.Get("/reports/products", handlers.GetReportsProducts(dashSvc))
	store.Get("/reports/customers", handlers.GetReportsCustomers(dashSvc))

	// SuperAdmin routes
	admin := api.Group("/admin", middleware.RequireSuperAdmin())
	admin.Get("/dashboard", handlers.AdminGetDashboard(adminSvc))
	admin.Get("/accounts", handlers.AdminListAccounts(adminSvc))
	admin.Get("/accounts/:accountId", handlers.AdminGetAccount(adminSvc))
	admin.Patch("/accounts/:accountId", handlers.AdminUpdateAccount(adminSvc))
	admin.Get("/stores", handlers.AdminListStores(adminSvc))
	admin.Get("/stores/:storeId", handlers.AdminGetStore(adminSvc))
	admin.Patch("/stores/:storeId", handlers.AdminUpdateStore(adminSvc))
	admin.Get("/audit-log", handlers.AdminGetAuditLog(adminSvc))
	admin.Get("/integrations/health", handlers.AdminIntegrationsHealth(adminSvc))
}
