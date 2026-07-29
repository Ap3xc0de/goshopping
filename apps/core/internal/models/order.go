package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Order represents a customer order.
type Order struct {
	ID         uuid.UUID  `json:"id"`
	StoreID    uuid.UUID  `json:"store_id"`
	CustomerID *uuid.UUID `json:"customer_id"`
	// Derived fields — populated by service queries via JOIN / computed expression.
	OrderNumber     string `json:"order_number"`
	CustomerName    string `json:"customer_name"`
	CustomerEmail   string `json:"customer_email"`
	CustomerPhone   string `json:"customer_phone"`
	CustomerAddress string `json:"customer_address"`
	// Core order data
	Status           string          `json:"status"` // pending | paid | preparing | shipped | delivered | cancelled
	Items            json.RawMessage `json:"items"`
	Subtotal         Money           `json:"subtotal"`
	Tax              Money           `json:"tax"`
	Total            Money           `json:"total"`
	PaymentMethod    string          `json:"payment_method"`
	PaymentRef       string          `json:"payment_reference"`
	ShippingTracking string          `json:"tracking_number"`
	Notes            string          `json:"notes"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

// OrderItem is a line-item within an order stored in JSONB.
type OrderItem struct {
	ProductID string `json:"product_id"`
	Name      string `json:"product_name"`
	Quantity  int    `json:"quantity"`
	Price     Money  `json:"unit_price"`
	Total     Money  `json:"total"`
}

// OrderItemInput is the input DTO when creating an order (only product_id + quantity).
type OrderItemInput struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

// CreateOrderInput is the DTO for order creation via the API.
type CreateOrderInput struct {
	CustomerID    *string          `json:"customer_id"`
	CustomerName  string           `json:"customer_name"`
	CustomerPhone string           `json:"customer_phone"`
	CustomerEmail string           `json:"customer_email"`
	Items         []OrderItemInput `json:"items"`
	PaymentMethod string           `json:"payment_method"`
	Notes         string           `json:"notes"`
}

// UpdateOrderStatusInput is the DTO for changing order status.
type UpdateOrderStatusInput struct {
	Status           string `json:"status"`
	PaymentRef       string `json:"payment_reference"`
	ShippingTracking string `json:"tracking_number"`
	Note             string `json:"note"`
}

// CancelOrderInput is the DTO for cancelling an order.
type CancelOrderInput struct {
	Reason string `json:"reason"`
}
