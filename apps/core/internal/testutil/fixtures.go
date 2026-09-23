package testutil

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// ── Product fixtures ──────────────────────────────────────────────────────────

type productArgs struct {
	name        string
	description string
	price       float64
	cost        float64
	stock       int
	minStock    int
	category    string
	categoryID  uuid.UUID
	status      string
	sku         string
}

// ProductOverride is a functional option for CreateTestProduct.
type ProductOverride func(*productArgs)

func WithName(v string) ProductOverride        { return func(a *productArgs) { a.name = v } }
func WithDescription(v string) ProductOverride { return func(a *productArgs) { a.description = v } }
func WithPrice(v float64) ProductOverride      { return func(a *productArgs) { a.price = v } }
func WithCost(v float64) ProductOverride       { return func(a *productArgs) { a.cost = v } }
func WithStock(v int) ProductOverride          { return func(a *productArgs) { a.stock = v } }
func WithMinStock(v int) ProductOverride       { return func(a *productArgs) { a.minStock = v } }
func WithCategory(v string) ProductOverride    { return func(a *productArgs) { a.category = v } }
func WithCategoryID(v uuid.UUID) ProductOverride {
	return func(a *productArgs) { a.categoryID = v }
}
func WithStatus(v string) ProductOverride { return func(a *productArgs) { a.status = v } }
func WithSKU(v string) ProductOverride    { return func(a *productArgs) { a.sku = v } }

// CreateTestProduct inserts a product row and returns the model.
func CreateTestProduct(t *testing.T, db *pgxpool.Pool, storeID uuid.UUID, opts ...ProductOverride) models.Product {
	t.Helper()

	args := &productArgs{
		name:     "Test Product",
		price:    10000,
		cost:     5000,
		stock:    100,
		minStock: 5,
		category: "general",
		status:   "active",
		sku:      "SKU-" + uuid.New().String()[:8],
	}
	for _, o := range opts {
		o(args)
	}

	id := uuid.New()
	ctx := context.Background()

	// category_id is nullable; pass NULL when no option set so the fixture
	// stays migration-011 aware without forcing every caller to care.
	var categoryID any
	if args.categoryID != uuid.Nil {
		categoryID = args.categoryID
	}

	var p models.Product
	err := db.QueryRow(ctx, `
		INSERT INTO products (id, store_id, name, sku, description, price, cost,
		                      stock, min_stock, category, category_id, images, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '[]', $12)
		RETURNING id, store_id, name, sku, description, price, cost,
		          stock, min_stock, category, images, status, created_at, updated_at`,
		id, storeID, args.name, args.sku, args.description, args.price, args.cost,
		args.stock, args.minStock, args.category, categoryID, args.status,
	).Scan(
		&p.ID, &p.StoreID, &p.Name, &p.SKU, &p.Description, &p.Price, &p.Cost,
		&p.Stock, &p.MinStock, &p.Category, &p.Images, &p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		t.Fatalf("CreateTestProduct: %v", err)
	}
	return p
}

// SetProductStock updates a product's stock directly in the DB.
func SetProductStock(t *testing.T, db *pgxpool.Pool, productID uuid.UUID, stock int) {
	t.Helper()
	status := "active"
	if stock == 0 {
		status = "out_of_stock"
	}
	if _, err := db.Exec(context.Background(),
		"UPDATE products SET stock = $1, status = $2, updated_at = NOW() WHERE id = $3",
		stock, status, productID,
	); err != nil {
		t.Fatalf("SetProductStock: %v", err)
	}
}

// ── Variant fixtures ─────────────────────────────────────────────────────────

type variantArgs struct {
	sku    string
	size   string
	color  string
	price  *models.Money
	stock  int
	status string
}

// VariantOverride is a functional option for CreateTestVariant.
type VariantOverride func(*variantArgs)

func WithVariantSKU(v string) VariantOverride    { return func(a *variantArgs) { a.sku = v } }
func WithVariantSize(v string) VariantOverride   { return func(a *variantArgs) { a.size = v } }
func WithVariantColor(v string) VariantOverride  { return func(a *variantArgs) { a.color = v } }
func WithVariantStatus(v string) VariantOverride { return func(a *variantArgs) { a.status = v } }
func WithVariantPrice(v float64) VariantOverride {
	return func(a *variantArgs) { m := models.NewMoney(v); a.price = &m }
}
func WithVariantStock(v int) VariantOverride { return func(a *variantArgs) { a.stock = v } }

// CreateTestVariant inserts a product_variants row (migration 011) and returns
// the model. price_override stays NULL unless WithVariantPrice is set; empty
// size/color are stored NULL (mirroring the DDL's nullable columns).
func CreateTestVariant(t *testing.T, db *pgxpool.Pool, storeID, productID uuid.UUID, opts ...VariantOverride) models.ProductVariant {
	t.Helper()

	args := &variantArgs{
		sku:    "VAR-" + uuid.New().String()[:8],
		size:   "M",
		stock:  0,
		status: "active",
	}
	for _, o := range opts {
		o(args)
	}

	var priceOverride any
	if args.price != nil {
		priceOverride = *args.price
	}

	var v models.ProductVariant
	err := db.QueryRow(context.Background(), `
		INSERT INTO product_variants (id, store_id, product_id, sku, size, color, price_override, stock, status)
		VALUES ($1, $2, $3, $4, NULLIF($5,''), NULLIF($6,''), $7, $8, $9)
		RETURNING id, store_id, product_id, sku, COALESCE(size,''), COALESCE(color,''),
		          price_override, stock, status, created_at, updated_at`,
		uuid.New(), storeID, productID, args.sku, args.size, args.color, priceOverride, args.stock, args.status,
	).Scan(&v.ID, &v.StoreID, &v.ProductID, &v.SKU, &v.Size, &v.Color,
		&v.PriceOverride, &v.Stock, &v.Status, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		t.Fatalf("CreateTestVariant: %v", err)
	}
	return v
}

// GetVariantStock reads a variant's current stock directly from the DB.
func GetVariantStock(t *testing.T, db *pgxpool.Pool, variantID uuid.UUID) int {
	t.Helper()
	var stock int
	if err := db.QueryRow(context.Background(),
		"SELECT stock FROM product_variants WHERE id = $1", variantID,
	).Scan(&stock); err != nil {
		t.Fatalf("GetVariantStock: %v", err)
	}
	return stock
}

// ── Category fixtures ─────────────────────────────────────────────────────────

type categoryArgs struct {
	name      string
	slug      string
	parentID  uuid.UUID
	sortOrder int
}

// CategoryOverride is a functional option for CreateTestCategory.
type CategoryOverride func(*categoryArgs)

func WithCategoryName(v string) CategoryOverride { return func(a *categoryArgs) { a.name = v } }
func WithCategorySlug(v string) CategoryOverride { return func(a *categoryArgs) { a.slug = v } }
func WithParent(v uuid.UUID) CategoryOverride    { return func(a *categoryArgs) { a.parentID = v } }
func WithSortOrder(v int) CategoryOverride       { return func(a *categoryArgs) { a.sortOrder = v } }

// CreateTestCategory inserts a category row (migration 011) and returns the model.
func CreateTestCategory(t *testing.T, db *pgxpool.Pool, storeID uuid.UUID, opts ...CategoryOverride) models.Category {
	t.Helper()

	args := &categoryArgs{
		name:      "Test Category",
		slug:      "test-category-" + uuid.New().String()[:8],
		sortOrder: 0,
	}
	for _, o := range opts {
		o(args)
	}

	var parentID *uuid.UUID
	if args.parentID != uuid.Nil {
		parentID = &args.parentID
	}

	var c models.Category
	err := db.QueryRow(context.Background(), `
		INSERT INTO categories (id, store_id, name, slug, parent_id, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, store_id, name, slug, parent_id, sort_order, created_at, updated_at`,
		uuid.New(), storeID, args.name, args.slug, parentID, args.sortOrder,
	).Scan(&c.ID, &c.StoreID, &c.Name, &c.Slug, &c.ParentID, &c.SortOrder, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		t.Fatalf("CreateTestCategory: %v", err)
	}
	return c
}

// ── Customer fixtures ─────────────────────────────────────────────────────────

type customerArgs struct {
	name  string
	email string
	phone string
	notes string
}

// CustomerOverride is a functional option for CreateTestCustomer.
type CustomerOverride func(*customerArgs)

func WithCustomerName(v string) CustomerOverride  { return func(a *customerArgs) { a.name = v } }
func WithCustomerEmail(v string) CustomerOverride { return func(a *customerArgs) { a.email = v } }
func WithCustomerPhone(v string) CustomerOverride { return func(a *customerArgs) { a.phone = v } }

// CreateTestCustomer inserts a customer and returns the model.
func CreateTestCustomer(t *testing.T, db *pgxpool.Pool, storeID uuid.UUID, opts ...CustomerOverride) models.Customer {
	t.Helper()

	args := &customerArgs{
		name:  "Test Customer",
		email: "customer-" + uuid.New().String()[:8] + "@test.com",
		phone: "555-0000",
	}
	for _, o := range opts {
		o(args)
	}

	id := uuid.New()
	ctx := context.Background()

	var cust models.Customer
	err := db.QueryRow(ctx, `
		INSERT INTO customers (id, store_id, name, email, phone, notes, address)
		VALUES ($1, $2, $3, $4, $5, $6, '{}')
		RETURNING id, store_id, name, email, phone, address, notes, created_at, updated_at`,
		id, storeID, args.name, args.email, args.phone, args.notes,
	).Scan(&cust.ID, &cust.StoreID, &cust.Name, &cust.Email, &cust.Phone, &cust.Address,
		&cust.Notes, &cust.CreatedAt, &cust.UpdatedAt)
	if err != nil {
		t.Fatalf("CreateTestCustomer: %v", err)
	}
	return cust
}

// ── Order fixtures ────────────────────────────────────────────────────────────

// CreateTestOrder inserts an order with the given products (1 unit each).
func CreateTestOrder(t *testing.T, db *pgxpool.Pool, storeID, customerID uuid.UUID, products []models.Product, status string) models.Order {
	t.Helper()

	if status == "" {
		status = "pending"
	}

	// Use models.OrderItem, never a local copy: the JSON tags are the stored
	// contract that queries read back (e.g. item->>'product_name' in
	// DashboardService.GetReportsProducts). A duplicated struct here silently
	// drifts from production and makes tests assert a shape no handler writes.
	items := make([]models.OrderItem, len(products))
	subtotal := models.MoneyZero()
	for i, p := range products {
		items[i] = models.OrderItem{
			ProductID: p.ID.String(),
			Name:      p.Name,
			Quantity:  1,
			Price:     p.Price,
			Total:     p.Price,
		}
		subtotal = subtotal.Add(p.Price)
	}
	tax := subtotal.Mul(decimal.NewFromFloat(0.19)).Round2()
	total := subtotal.Add(tax)

	itemsJSON, err := json.Marshal(items)
	if err != nil {
		t.Fatalf("CreateTestOrder: marshal items: %v", err)
	}

	ctx := context.Background()
	var custIDPtr *uuid.UUID
	if customerID != uuid.Nil {
		custIDPtr = &customerID
	}

	var o models.Order
	err = db.QueryRow(ctx, `
		INSERT INTO orders (store_id, customer_id, status, items, subtotal, tax, total, payment_method, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'cash', '')
		RETURNING id, store_id, customer_id, status, items,
		          subtotal, tax, total, payment_method,
		          COALESCE(payment_ref,''), COALESCE(shipping_tracking,''),
		          notes, created_at, updated_at`,
		storeID, custIDPtr, status, itemsJSON, subtotal, tax, total,
	).Scan(
		&o.ID, &o.StoreID, &o.CustomerID, &o.Status, &o.Items,
		&o.Subtotal, &o.Tax, &o.Total, &o.PaymentMethod, &o.PaymentRef, &o.ShippingTracking,
		&o.Notes, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		t.Fatalf("CreateTestOrder: %v", err)
	}
	return o
}

// ── API key fixtures ─────────────────────────────────────────────────────────

// CreateTestAPIKey inserts a store_api_keys row and returns the model plus the
// plaintext key — the plaintext is what a store owner saw exactly once at
// creation time.
func CreateTestAPIKey(t *testing.T, db *pgxpool.Pool, storeID uuid.UUID, name string) (models.APIKey, string) {
	t.Helper()

	plaintext, err := models.GenerateKey()
	if err != nil {
		t.Fatalf("CreateTestAPIKey: generate key: %v", err)
	}

	key := models.APIKey{
		ID:      uuid.New(),
		StoreID: storeID,
		Name:    name,
		KeyHash: models.HashKey(plaintext),
		Prefix:  models.PrefixOf(plaintext),
		Active:  true,
	}

	err = db.QueryRow(context.Background(), `
		INSERT INTO store_api_keys (id, store_id, name, key_hash, prefix, active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at`,
		key.ID, key.StoreID, key.Name, key.KeyHash, key.Prefix, key.Active,
	).Scan(&key.CreatedAt)
	if err != nil {
		t.Fatalf("CreateTestAPIKey: insert: %v", err)
	}
	return key, plaintext
}

// APIKeyAuthHeader returns the Authorization header value for a plaintext key.
func APIKeyAuthHeader(plaintext string) string {
	return "Bearer " + plaintext
}

// ── Utility helpers ───────────────────────────────────────────────────────────

// GetStoreSlug reads the slug for a store from DB.
func GetStoreSlug(t *testing.T, db *pgxpool.Pool, storeID uuid.UUID) string {
	t.Helper()
	var slug string
	if err := db.QueryRow(context.Background(),
		"SELECT slug FROM stores WHERE id = $1", storeID,
	).Scan(&slug); err != nil {
		t.Fatalf("GetStoreSlug: %v", err)
	}
	return slug
}
