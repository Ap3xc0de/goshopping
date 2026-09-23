package models

import (
	"time"

	"github.com/google/uuid"
)

// ShippingZone groups shipping methods for admin organization/display order.
// Migration 011 (storefront-complete-commerce-api). Zone→address mapping is
// deferred to a future change (design decision 2): v1 buyers pick a method by
// code directly, and zones only drive display grouping today.
type ShippingZone struct {
	ID        uuid.UUID `json:"id"         db:"id"`
	StoreID   uuid.UUID `json:"store_id"   db:"store_id"`
	Name      string    `json:"name"       db:"name"`
	SortOrder int       `json:"sort_order" db:"sort_order"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// ShippingMethod is a carrier option within a zone, priced by
// base_price + weight_total_kg × weight_rate (design decision 1). Code is
// unique per store — quotes/orders reference it, never the numeric id.
type ShippingMethod struct {
	ID         uuid.UUID `json:"id"          db:"id"`
	StoreID    uuid.UUID `json:"store_id"    db:"store_id"`
	ZoneID     uuid.UUID `json:"zone_id"     db:"zone_id"`
	Code       string    `json:"code"        db:"code"`
	Name       string    `json:"name"        db:"name"`
	BasePrice  Money     `json:"base_price"  db:"base_price"`
	WeightRate Money     `json:"weight_rate" db:"weight_rate"`
	Active     bool      `json:"active"      db:"active"`
	CreatedAt  time.Time `json:"created_at"  db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"  db:"updated_at"`
}

// CreateShippingZoneRequest is the DTO for zone creation (admin CRUD).
type CreateShippingZoneRequest struct {
	Name      string `json:"name"`
	SortOrder int    `json:"sort_order"`
}

// CreateShippingMethodRequest is the DTO for method creation (admin CRUD).
// Active defaults to true when omitted.
type CreateShippingMethodRequest struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	BasePrice  Money  `json:"base_price"`
	WeightRate Money  `json:"weight_rate"`
	Active     *bool  `json:"active"`
}

// UpdateShippingMethodRequest is the DTO for partial method updates. Nil
// fields are left untouched. Code is immutable once created (quotes/orders
// may already reference it).
type UpdateShippingMethodRequest struct {
	Name       *string `json:"name"`
	BasePrice  *Money  `json:"base_price"`
	WeightRate *Money  `json:"weight_rate"`
	Active     *bool   `json:"active"`
}

// NewsletterSubscriber represents an email captured via POST /newsletter.
// UNIQUE(store_id, email) is the real duplicate guard — the in-memory rate
// limiter (design decision 4) is best-effort, per-instance.
type NewsletterSubscriber struct {
	ID        uuid.UUID `json:"id"         db:"id"`
	StoreID   uuid.UUID `json:"store_id"   db:"store_id"`
	Email     string    `json:"email"      db:"email"`
	Status    string    `json:"status"     db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// SubscribeNewsletterRequest is the DTO for POST /newsletter.
type SubscribeNewsletterRequest struct {
	Email string `json:"email"`
}
