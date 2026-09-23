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
	// CategoryID references a LEAF node of the store's hierarchical category
	// tree (migration 011, categories.id). Nil means the product has no
	// hierarchical category assigned. When set, the legacy Category string
	// above is kept in sync with that category's slug (services.ProductService
	// resolveCategoryAssignment) so the offer resolver's category-scope and
	// the legacy `?category=` filter keep working during the transition.
	CategoryID *uuid.UUID      `json:"category_id" db:"category_id"`
	Images     json.RawMessage `json:"images"      db:"images"`
	Status      string          `json:"status"      db:"status"` // active | inactive | out_of_stock | deleted
	// Weight is in kg (NUMERIC(8,3) in migration 011 — 1 g precision). It feeds
	// shipping formulas: weight_total = Σ(weight × qty) (shipping-zones REQ:
	// Product Weight Field). Product-level, NOT per-variant.
	Weight    float64   `json:"weight"      db:"weight"`
	CreatedAt time.Time `json:"created_at"  db:"created_at"`
	UpdatedAt time.Time `json:"updated_at"  db:"updated_at"`
}

// CreateProductRequest is the DTO for product creation.
//
// CategoryID is a *string (not *uuid.UUID) on purpose: nil/absent or ""
// both mean "no category" — a plain optional field, no ambiguity to resolve
// on create. A non-empty value must parse as a UUID identifying a LEAF
// category (no children) in the SAME store; ProductService resolves and
// validates it (resolveCategoryAssignment) and syncs the legacy Category
// string to that category's slug.
type CreateProductRequest struct {
	Name        string   `json:"name"        validate:"required,min=1"`
	SKU         string   `json:"sku"`
	Description string   `json:"description"`
	Price       Money    `json:"price"       validate:"required"`
	Cost        Money    `json:"cost"`
	Stock       int      `json:"stock"       validate:"min=0"`
	MinStock    int      `json:"min_stock"   validate:"min=0"`
	Category    string   `json:"category"`
	CategoryID  *string  `json:"category_id"`
	Images      []string `json:"images"`
	Weight      float64  `json:"weight"`
}

// UpdateProductRequest is the DTO for partial product update (all fields optional).
//
// CategoryID uses a three-state *string convention (deliberately NOT the
// uuid.Nil-sentinel pattern UpdateCategoryRequest.ParentID uses, because a
// *uuid.UUID cannot hold an empty string and the admin <select>'s "Sin
// categoría" option naturally posts ""):
//   - field absent (nil)   -> unchanged, category_id/category untouched
//   - explicit ""          -> cleared: category_id set to NULL and the
//                             legacy Category string reset to ""
//   - a UUID string        -> reassigned to that LEAF category in the SAME
//                             store (else rejected); legacy Category is
//                             synced to the resolved category's slug,
//                             overriding whatever the sibling Category field
//                             below carries in the same request
type UpdateProductRequest struct {
	Name        *string  `json:"name"`
	SKU         *string  `json:"sku"`
	Description *string  `json:"description"`
	Price       *Money   `json:"price"`
	Cost        *Money   `json:"cost"`
	Stock       *int     `json:"stock"`
	MinStock    *int     `json:"min_stock"`
	Category    *string  `json:"category"`
	CategoryID  *string  `json:"category_id"`
	Status      *string  `json:"status"`
	Weight      *float64 `json:"weight"`
}
