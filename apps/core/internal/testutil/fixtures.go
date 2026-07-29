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
	name     string
	price    float64
	cost     float64
	stock    int
	minStock int
	category string
	status   string
	sku      string
}

// ProductOverride is a functional option for CreateTestProduct.
type ProductOverride func(*productArgs)

func WithName(v string) ProductOverride     { return func(a *productArgs) { a.name = v } }
func WithPrice(v float64) ProductOverride   { return func(a *productArgs) { a.price = v } }
func WithCost(v float64) ProductOverride    { return func(a *productArgs) { a.cost = v } }
func WithStock(v int) ProductOverride       { return func(a *productArgs) { a.stock = v } }
func WithMinStock(v int) ProductOverride    { return func(a *productArgs) { a.minStock = v } }
func WithCategory(v string) ProductOverride { return func(a *productArgs) { a.category = v } }
func WithStatus(v string) ProductOverride   { return func(a *productArgs) { a.status = v } }
func WithSKU(v string) ProductOverride      { return func(a *productArgs) { a.sku = v } }

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

	var p models.Product
	err := db.QueryRow(ctx, `
		INSERT INTO products (id, store_id, name, sku, description, price, cost,
		                      stock, min_stock, category, images, status)
		VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8, $9, '[]', $10)
		RETURNING id, store_id, name, sku, description, price, cost,
		          stock, min_stock, category, images, status, created_at, updated_at`,
		id, storeID, args.name, args.sku, args.price, args.cost,
		args.stock, args.minStock, args.category, args.status,
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

	type orderItem struct {
		ProductID uuid.UUID    `json:"product_id"`
		Name      string       `json:"name"`
		Quantity  int          `json:"quantity"`
		Price     models.Money `json:"price"`
		Total     models.Money `json:"total"`
	}
	items := make([]orderItem, len(products))
	subtotal := models.MoneyZero()
	for i, p := range products {
		items[i] = orderItem{
			ProductID: p.ID,
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
