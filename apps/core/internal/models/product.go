package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Product represents a store product.
type Product struct {
	ID          uuid.UUID       `json:"id"          db:"id"`
	StoreID     uuid.UUID       `json:"store_id"    db:"store_id"`
	Name        string          `json:"name"        db:"name"`
	SKU         string          `json:"sku"         db:"sku"`
	Description string          `json:"description" db:"description"`
	Price       Money           `json:"price"       db:"price"`
	Cost        Money           `json:"cost"        db:"cost"`
	Stock       int             `json:"stock"       db:"stock"`
	MinStock    int             `json:"min_stock"   db:"min_stock"`
	Category    string          `json:"category"    db:"category"`
	Images      json.RawMessage `json:"images"      db:"images"`
	Status      string          `json:"status"      db:"status"` // active | inactive | out_of_stock | deleted
	CreatedAt   time.Time       `json:"created_at"  db:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"  db:"updated_at"`
}

// CreateProductRequest is the DTO for product creation.
type CreateProductRequest struct {
	Name        string   `json:"name"        validate:"required,min=1"`
	SKU         string   `json:"sku"`
	Description string   `json:"description"`
	Price       Money    `json:"price"       validate:"required"`
	Cost        Money    `json:"cost"`
	Stock       int      `json:"stock"       validate:"min=0"`
	MinStock    int      `json:"min_stock"   validate:"min=0"`
	Category    string   `json:"category"`
	Images      []string `json:"images"`
}

// UpdateProductRequest is the DTO for partial product update (all fields optional).
type UpdateProductRequest struct {
	Name        *string `json:"name"`
	SKU         *string `json:"sku"`
	Description *string `json:"description"`
	Price       *Money  `json:"price"`
	Cost        *Money  `json:"cost"`
	Stock       *int    `json:"stock"`
	MinStock    *int    `json:"min_stock"`
	Category    *string `json:"category"`
	Status      *string `json:"status"`
}
