package models

import (
	"time"

	"github.com/google/uuid"
)

// Category represents a store category in the hierarchical tree introduced by
// migration 011 (storefront-complete-commerce-api). Slug is unique per store;
// ParentID is nil for root categories.
type Category struct {
	ID        uuid.UUID  `json:"id"         db:"id"`
	StoreID   uuid.UUID  `json:"store_id"   db:"store_id"`
	Name      string     `json:"name"       db:"name"`
	Slug      string     `json:"slug"       db:"slug"`
	ParentID  *uuid.UUID `json:"parent_id"  db:"parent_id"`
	SortOrder int        `json:"sort_order" db:"sort_order"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

// CategoryNode is a node of the public category tree: category fields plus the
// real number of ACTIVE products assigned to it (SQL GROUP BY, direct
// assignments only) and its nested children.
type CategoryNode struct {
	ID           uuid.UUID
	Name         string
	Slug         string
	ProductCount int
	Children     []CategoryNode
}

// CreateCategoryRequest is the DTO for category creation. Slug is generated
// server-side from Name (unique per store).
type CreateCategoryRequest struct {
	Name      string     `json:"name"`
	ParentID  *uuid.UUID `json:"parent_id"`
	SortOrder int        `json:"sort_order"`
}

// UpdateCategoryRequest is the DTO for partial category updates. Nil fields
// are left untouched.
type UpdateCategoryRequest struct {
	Name      *string    `json:"name"`
	ParentID  *uuid.UUID `json:"parent_id"`
	SortOrder *int       `json:"sort_order"`
}
