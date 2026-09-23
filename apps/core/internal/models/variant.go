package models

import (
	"time"

	"github.com/google/uuid"
)

// ProductVariant represents a product variant (size/color) with its own SKU,
// optional price override, and independent stock — migration 011
// (storefront-complete-commerce-api). Status is limited by the 011 CHECK
// constraint to 'active'|'inactive' (the delta spec's out_of_stock|deleted
// values do not exist in the shipped DDL; deletion is a physical DELETE).
type ProductVariant struct {
	ID            uuid.UUID `json:"id"             db:"id"`
	StoreID       uuid.UUID `json:"store_id"       db:"store_id"`
	ProductID     uuid.UUID `json:"product_id"     db:"product_id"`
	SKU           string    `json:"sku"            db:"sku"`
	Size          string    `json:"size"           db:"size"`
	Color         string    `json:"color"          db:"color"`
	PriceOverride *Money    `json:"price_override" db:"price_override"`
	Stock         int       `json:"stock"          db:"stock"`
	Status        string    `json:"status"         db:"status"`
	CreatedAt     time.Time `json:"created_at"     db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"     db:"updated_at"`
}

// ResolvePrice returns price_override when set, else the product-level price.
// This is the single variant pricing fallback used by quotes, orders, and the
// public product serialization (product-variants REQ: Variant-Aware Quote).
func (v ProductVariant) ResolvePrice(productPrice Money) Money {
	if v.PriceOverride != nil {
		return *v.PriceOverride
	}
	return productPrice
}

// CreateVariantRequest is the DTO for variant creation (admin CRUD).
type CreateVariantRequest struct {
	SKU           string `json:"sku" validate:"required,min=1"`
	Size          string `json:"size"`
	Color         string `json:"color"`
	PriceOverride *Money `json:"price_override"`
	Stock         int    `json:"stock" validate:"min=0"`
	Status        string `json:"status"`
}

// UpdateVariantRequest is the DTO for partial variant updates (admin CRUD).
// Nil fields are left untouched.
type UpdateVariantRequest struct {
	SKU           *string `json:"sku"`
	Size          *string `json:"size"`
	Color         *string `json:"color"`
	PriceOverride *Money  `json:"price_override"`
	Stock         *int    `json:"stock"`
	Status        *string `json:"status"`
}
