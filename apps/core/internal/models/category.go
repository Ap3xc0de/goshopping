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

// CategoryPathEntry is one breadcrumb step in a CategoryNode's Path — the
// root-to-node chain, inclusive — so callers can render breadcrumbs without a
// second lookup per node.
type CategoryPathEntry struct {
	ID   uuid.UUID
	Name string
	Slug string
}

// CategoryNode is a node of the public category tree: category fields plus
// the real number of ACTIVE products assigned to it (SQL GROUP BY, direct
// assignments only), its nested children, and tree-derived metadata:
//
//   - ParentID mirrors Category.ParentID (nil for roots).
//   - Depth is the node's distance from its root (0 = root).
//   - SortOrder mirrors Category.SortOrder (children are ordered by
//     sort_order then name at every level, same as the admin flat list).
//   - Path is the root→node breadcrumb chain, inclusive.
//   - TotalProductCount is the DISTINCT count of active products in this node
//     PLUS all of its descendants. A product has a single category_id (see
//     products.category_id), so it can only ever be counted once across the
//     whole tree — summing ProductCount up the tree (this node's own direct
//     count plus the already-rolled-up totals of its children) is
//     distinct-safe without needing a SQL DISTINCT or a recursive CTE.
type CategoryNode struct {
	ID                uuid.UUID
	Name              string
	Slug              string
	ParentID          *uuid.UUID
	Depth             int
	SortOrder         int
	Path              []CategoryPathEntry
	ProductCount      int
	TotalProductCount int
	Children          []CategoryNode
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
