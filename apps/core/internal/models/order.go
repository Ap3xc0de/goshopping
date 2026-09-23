package models

import (
	"encoding/json"
	"fmt"
	"strings"
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
	DiscountTotal    Money           `json:"discount_total"`
	Tax              Money           `json:"tax"`
	Total            Money           `json:"total"`
	CouponID         *uuid.UUID      `json:"coupon_id,omitempty"`
	PaymentMethod    string          `json:"payment_method"`
	PaymentRef       string          `json:"payment_reference"`
	ShippingTracking string          `json:"tracking_number"`
	Notes            string          `json:"notes"`
	// ShippingAddress is the order's own delivery address (see
	// ShippingAddress doc comment) — nullable, stored as raw JSONB so the
	// service layer decides when to unmarshal it. PaymentStatus tracks the
	// payment lifecycle independently of Status (order fulfillment).
	ShippingAddress json.RawMessage `json:"shipping_address,omitempty"`
	PaymentStatus   string          `json:"payment_status"` // pending | paid | failed | refunded
	// ShippingMethod/ShippingTotal/Currency are stamped server-side at
	// creation (shipping-zones + store-currency REQs); ShippingMethod is the
	// method code the buyer selected, empty for pre-shipping orders.
	ShippingMethod string    `json:"shipping_method,omitempty"`
	ShippingTotal  Money     `json:"shipping_total"`
	Currency       string    `json:"currency"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// OrderItem is a line-item within an order stored in JSONB. VariantID/SKU/
// Size/Color are snapshots captured at order time; VariantID is only present
// when the line referenced a variant. omitempty keeps pre-variant rows byte-
// compatible — old orders simply lack these keys and still unmarshal fine.
type OrderItem struct {
	ProductID string `json:"product_id"`
	Name      string `json:"product_name"`
	Quantity  int    `json:"quantity"`
	Price     Money  `json:"unit_price"`
	Total     Money  `json:"total"`
	VariantID string `json:"variant_id,omitempty"`
	SKU       string `json:"sku,omitempty"`
	Size      string `json:"size,omitempty"`
	Color     string `json:"color,omitempty"`
}

// OrderItemInput is the input DTO when creating an order. VariantID is
// optional: empty (zero value) = product-level line — legacy payloads that
// predate variants keep working unchanged (product-variants REQ: Variant
// Order Lines, Old Orders Readable).
type OrderItemInput struct {
	ProductID string `json:"product_id"`
	VariantID string `json:"variant_id"`
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
	CouponCode    *string          `json:"coupon_code,omitempty"`
	// ShippingAddress is the destination for this specific order. It is
	// intentionally NOT persisted onto the customer record (see
	// order_service.go CreateOrder, Stage 7) — an order's delivery address
	// can differ from any address stored elsewhere, and future orders from
	// the same customer must not silently inherit it.
	ShippingAddress *ShippingAddress `json:"shipping_address,omitempty"`
	Notes           string           `json:"notes"`
	// ShippingMethod is a shipping method code (optional): present → the
	// server resolves it, computes shipping_total server-side, and never
	// trusts a client-provided number; omitted → shipping_total 0, unchanged
	// from before this change (shipping-zones REQ: Quote Carrier Cost).
	ShippingMethod *string `json:"shipping_method,omitempty"`
}

// ShippingAddress is the delivery address captured per order.
type ShippingAddress struct {
	Street  string `json:"street"`
	City    string `json:"city"`
	State   string `json:"state"`
	Zip     string `json:"zip"`
	Country string `json:"country,omitempty"`
	Notes   string `json:"notes,omitempty"`
}

// Validate checks that street/city/state/zip are all present. Called only
// when a ShippingAddress is provided at all — it is optional on
// CreateOrderInput, but once present it must be complete enough to ship to.
func (a *ShippingAddress) Validate() error {
	var missing []string
	if strings.TrimSpace(a.Street) == "" {
		missing = append(missing, "street")
	}
	if strings.TrimSpace(a.City) == "" {
		missing = append(missing, "city")
	}
	if strings.TrimSpace(a.State) == "" {
		missing = append(missing, "state")
	}
	if strings.TrimSpace(a.Zip) == "" {
		missing = append(missing, "zip")
	}
	if len(missing) > 0 {
		return fmt.Errorf("shipping_address missing required field(s): %s", strings.Join(missing, ", "))
	}
	return nil
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
