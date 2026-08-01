package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/handlers"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	storeWrite = middleware.RequireStoreRoles("owner", "operator")
	storeRead  = middleware.RequireStoreRoles("owner", "operator", "accountant")
)

// Setup registers all routes on the Fiber app.
func Setup(app *fiber.App, cfg *config.Config, db *pgxpool.Pool, eventSvc *services.EventService) {
	// ── Services ─────────────────────────────────────────────────────────────
	authSvc := services.NewAuthService(db, cfg)
	prodSvc := services.NewProductService(db, cfg, eventSvc)
	custSvc := services.NewCustomerService(db, cfg)
	orderSvc := services.NewOrderService(db, cfg, eventSvc, custSvc, prodSvc)
	dashSvc := services.NewDashboardService(db, cfg)
	adminSvc := services.NewAdminService(db, cfg)

	// ── Public routes (no auth) ───────────────────────────────────────────────
	app.Get("/health", handlers.Health(db, cfg))

	authGroup := app.Group("/auth")
	authGroup.Post("/register", handlers.Register(authSvc))
	authGroup.Post("/login", handlers.Login(authSvc))
	authGroup.Post("/refresh", handlers.Refresh(authSvc))

	// Public storefront (no auth)
	pub := app.Group("/public")
	pub.Get("/:storeSlug/config", handlers.PublicStoreConfig(db))
	pub.Get("/:storeSlug/products", handlers.PublicListProducts(db, cfg))
	pub.Get("/:storeSlug/products/:productId", handlers.PublicGetProduct(db, cfg))
	pub.Post("/:storeSlug/orders", handlers.PublicCreateOrder(db, cfg))
	pub.Get("/:storeSlug/orders/:orderId/status", handlers.PublicOrderStatus(db, cfg))

	// ── Protected routes ──────────────────────────────────────────────────────
	api := app.Group("/", middleware.Auth(cfg.JWTSecret))

	// Store-scoped routes
	store := api.Group("/stores/:storeId", middleware.StoreContext(db))

	// Products
	store.Get("/products", storeRead, handlers.ListProducts(prodSvc))
	store.Post("/products", storeWrite, handlers.CreateProduct(prodSvc))
	store.Post("/products/bulk-import", storeWrite, handlers.BulkImportProducts(prodSvc))
	store.Get("/products/:productId", storeRead, handlers.GetProduct(prodSvc))
	store.Put("/products/:productId", storeWrite, handlers.UpdateProduct(prodSvc))
	store.Delete("/products/:productId", storeWrite, handlers.DeleteProduct(prodSvc))
	store.Post("/products/:productId/images", storeWrite, handlers.ProductImageUpload(prodSvc))

	// Orders
	store.Get("/orders", storeRead, handlers.ListOrders(orderSvc))
	store.Post("/orders", storeWrite, handlers.CreateOrder(orderSvc))
	store.Get("/orders/export", storeRead, handlers.ExportOrders(orderSvc))
	store.Get("/orders/:orderId", storeRead, handlers.GetOrder(orderSvc))
	store.Patch("/orders/:orderId/status", storeWrite, handlers.ChangeOrderStatus(orderSvc))
	store.Post("/orders/:orderId/cancel", storeWrite, handlers.CancelOrder(orderSvc))

	// Customers
	store.Get("/customers", storeRead, handlers.ListCustomers(custSvc))
	store.Post("/customers", storeWrite, handlers.CreateCustomer(custSvc))
	store.Get("/customers/:customerId", storeRead, handlers.GetCustomer(custSvc))
	store.Put("/customers/:customerId", storeWrite, handlers.UpdateCustomer(custSvc))
	store.Get("/customers/:customerId/orders", storeRead, handlers.CustomerOrders(custSvc))

	// Dashboard
	store.Get("/dashboard", storeRead, handlers.GetDashboard(dashSvc))

	// Reports
	store.Get("/reports/sales", storeRead, handlers.GetReportsSales(dashSvc))
	store.Get("/reports/products", storeRead, handlers.GetReportsProducts(dashSvc))
	store.Get("/reports/customers", storeRead, handlers.GetReportsCustomers(dashSvc))

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
