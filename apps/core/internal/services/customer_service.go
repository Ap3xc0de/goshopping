package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrCustomerNotFound = errors.New("customer not found")

// CustomerService handles business logic for customers.
type CustomerService struct {
	db  *pgxpool.Pool
	cfg *config.Config
}

// NewCustomerService creates a new CustomerService.
func NewCustomerService(db *pgxpool.Pool, cfg *config.Config) *CustomerService {
	return &CustomerService{db: db, cfg: cfg}
}

// ListCustomersResult holds paginated customers.
type ListCustomersResult struct {
	Customers  []models.Customer
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// ListCustomers returns a paginated list of customers for a store.
func (s *CustomerService) ListCustomers(storeID uuid.UUID, page, perPage int, search string) (*ListCustomersResult, error) {
	ctx := context.Background()
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	conditions := []string{"store_id = $1"}
	args := []interface{}{storeID}
	idx := 2

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR email ILIKE $%d OR phone ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM customers "+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count customers: %w", err)
	}

	args = append(args, perPage, offset)
	query := fmt.Sprintf(`
		SELECT id, store_id, name, COALESCE(email,'') as email, COALESCE(phone,'') as phone,
		       COALESCE(address,'') as address, COALESCE(notes,'') as notes, created_at, updated_at
		FROM customers %s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d`, where, idx, idx+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query customers: %w", err)
	}
	defer rows.Close()

	customers := []models.Customer{}
	for rows.Next() {
		var c models.Customer
		if err := rows.Scan(&c.ID, &c.StoreID, &c.Name, &c.Email, &c.Phone,
			&c.Address, &c.Notes, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan customer: %w", err)
		}
		customers = append(customers, c)
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}
	return &ListCustomersResult{Customers: customers, Total: total, Page: page, PerPage: perPage, TotalPages: totalPages}, nil
}

// GetCustomer returns a single customer scoped to the store.
func (s *CustomerService) GetCustomer(storeID, customerID uuid.UUID) (*models.Customer, error) {
	ctx := context.Background()
	var c models.Customer
	err := s.db.QueryRow(ctx, `
		SELECT id, store_id, name, COALESCE(email,'') as email, COALESCE(phone,'') as phone,
		       COALESCE(address,'') as address, COALESCE(notes,'') as notes, created_at, updated_at
		FROM customers
		WHERE id = $1 AND store_id = $2`,
		customerID, storeID,
	).Scan(&c.ID, &c.StoreID, &c.Name, &c.Email, &c.Phone,
		&c.Address, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCustomerNotFound
		}
		return nil, fmt.Errorf("get customer: %w", err)
	}
	return &c, nil
}

// CreateCustomer creates a new customer. Returns ErrCustomerNotFound if store doesn't own.
func (s *CustomerService) CreateCustomer(storeID uuid.UUID, req models.CreateCustomerRequest) (*models.Customer, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	ctx := context.Background()
	var c models.Customer
	err := s.db.QueryRow(ctx, `
		INSERT INTO customers (store_id, name, email, phone, address, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, store_id, name, COALESCE(email,'') as email, COALESCE(phone,'') as phone,
		          COALESCE(address,'') as address, COALESCE(notes,'') as notes, created_at, updated_at`,
		storeID, req.Name, req.Email, req.Phone, req.Address, req.Notes,
	).Scan(&c.ID, &c.StoreID, &c.Name, &c.Email, &c.Phone,
		&c.Address, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create customer: %w", err)
	}
	return &c, nil
}

// CreateOrUpsertCustomer creates a customer or updates an existing one with the same email in the store.
func (s *CustomerService) CreateOrUpsertCustomer(storeID uuid.UUID, req models.CreateCustomerRequest) (*models.Customer, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	ctx := context.Background()
	var c models.Customer
	err := s.db.QueryRow(ctx, `
		INSERT INTO customers (store_id, name, email, phone, address, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (store_id, email) DO UPDATE
		  SET name  = COALESCE(NULLIF(EXCLUDED.name,''),  customers.name),
		      phone = COALESCE(NULLIF(EXCLUDED.phone,''), customers.phone),
		      updated_at = NOW()
		RETURNING id, store_id, name, COALESCE(email,'') as email, COALESCE(phone,'') as phone,
		          COALESCE(address,'') as address, COALESCE(notes,'') as notes, created_at, updated_at`,
		storeID, req.Name, req.Email, req.Phone, req.Address, req.Notes,
	).Scan(&c.ID, &c.StoreID, &c.Name, &c.Email, &c.Phone,
		&c.Address, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("upsert customer: %w", err)
	}
	return &c, nil
}

// UpdateCustomer applies a partial update to a customer.
func (s *CustomerService) UpdateCustomer(storeID, customerID uuid.UUID, req models.UpdateCustomerRequest) (*models.Customer, error) {
	cur, err := s.GetCustomer(storeID, customerID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		cur.Name = *req.Name
	}
	if req.Email != nil {
		cur.Email = *req.Email
	}
	if req.Phone != nil {
		cur.Phone = *req.Phone
	}
	if req.Address != nil {
		cur.Address = *req.Address
	}
	if req.Notes != nil {
		cur.Notes = *req.Notes
	}

	ctx := context.Background()
	var updated models.Customer
	err = s.db.QueryRow(ctx, `
		UPDATE customers
		SET name=$1, email=$2, phone=$3, address=$4, notes=$5, updated_at=NOW()
		WHERE id=$6 AND store_id=$7
		RETURNING id, store_id, name, COALESCE(email,'') as email, COALESCE(phone,'') as phone,
		          COALESCE(address,'') as address, COALESCE(notes,'') as notes, created_at, updated_at`,
		cur.Name, cur.Email, cur.Phone, cur.Address, cur.Notes,
		customerID, storeID,
	).Scan(&updated.ID, &updated.StoreID, &updated.Name, &updated.Email, &updated.Phone,
		&updated.Address, &updated.Notes, &updated.CreatedAt, &updated.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update customer: %w", err)
	}
	return &updated, nil
}

// GetCustomerOrders returns paginated orders for a specific customer.
func (s *CustomerService) GetCustomerOrders(storeID, customerID uuid.UUID, page, perPage int) ([]models.Order, int64, error) {
	ctx := context.Background()
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	var total int64
	if err := s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM orders WHERE store_id=$1 AND customer_id=$2`,
		storeID, customerID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count customer orders: %w", err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, store_id, customer_id, status, items, subtotal, tax, total,
		       COALESCE(payment_method,'') as payment_method,
		       COALESCE(payment_ref,'') as payment_ref,
		       COALESCE(shipping_tracking,'') as shipping_tracking,
		       COALESCE(notes,'') as notes, created_at, updated_at
		FROM orders
		WHERE store_id=$1 AND customer_id=$2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`,
		storeID, customerID, perPage, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("query customer orders: %w", err)
	}
	defer rows.Close()

	orders := []models.Order{}
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.StoreID, &o.CustomerID, &o.Status, &o.Items,
			&o.Subtotal, &o.Tax, &o.Total, &o.PaymentMethod, &o.PaymentRef,
			&o.ShippingTracking, &o.Notes, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan order: %w", err)
		}
		orders = append(orders, o)
	}
	return orders, total, rows.Err()
}
