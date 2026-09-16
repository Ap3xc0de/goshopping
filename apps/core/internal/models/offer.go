package models

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Offer discounts a store's whole catalog, a category, or a single product
// within an optional time window. See docs/ADR/008-money-decimal.md for why
// DiscountValue is Money rather than float64.
type Offer struct {
	ID            uuid.UUID  `json:"id"                    db:"id"`
	StoreID       uuid.UUID  `json:"store_id"              db:"store_id"`
	Name          string     `json:"name"                  db:"name"`
	Description   string     `json:"description"           db:"description"`
	DiscountType  string     `json:"discount_type"         db:"discount_type"` // "percentage" | "fixed"
	DiscountValue Money      `json:"discount_value"        db:"discount_value"`
	Scope         string     `json:"scope"                 db:"scope"` // "store" | "category" | "product"
	ScopeValue    *string    `json:"scope_value,omitempty" db:"scope_value"`
	StartsAt      *time.Time `json:"starts_at,omitempty"   db:"starts_at"`
	EndsAt        *time.Time `json:"ends_at,omitempty"     db:"ends_at"`
	Status        string     `json:"status"                db:"status"` // "active" | "inactive"
	CreatedAt     time.Time  `json:"created_at"            db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"            db:"updated_at"`
}

// IsActiveAt reports whether the offer is enabled and within its time window
// at t. A nil StartsAt/EndsAt is unbounded on that side (REQ-OFFER-01).
// Both boundaries are inclusive: an offer is active exactly at starts_at and
// exactly at ends_at, only excluded once t is strictly before/after them.
func (o *Offer) IsActiveAt(t time.Time) bool {
	if o.Status != "active" {
		return false
	}
	if o.StartsAt != nil && t.Before(*o.StartsAt) {
		return false
	}
	if o.EndsAt != nil && t.After(*o.EndsAt) {
		return false
	}
	return true
}

// Validate checks the offer's own invariants, independent of persistence,
// mirroring the offers table's CHECK constraints so invalid input is
// rejected with a field-scoped message before it ever reaches the DB.
func (o *Offer) Validate() error {
	var errs ValidationErrors

	if strings.TrimSpace(o.Name) == "" {
		errs = append(errs, FieldError{Field: "name", Message: "is required"})
	}

	switch o.DiscountType {
	case "percentage", "fixed":
	default:
		errs = append(errs, FieldError{Field: "discount_type", Message: "must be 'percentage' or 'fixed'"})
	}
	if !o.DiscountValue.IsPositive() {
		errs = append(errs, FieldError{Field: "discount_value", Message: "must be greater than 0"})
	}
	if o.DiscountType == "percentage" && o.DiscountValue.GreaterThan(decimal.NewFromInt(100)) {
		errs = append(errs, FieldError{Field: "discount_value", Message: "percentage discount cannot exceed 100"})
	}

	switch o.Scope {
	case "store":
	case "category", "product":
		if o.ScopeValue == nil || strings.TrimSpace(*o.ScopeValue) == "" {
			errs = append(errs, FieldError{Field: "scope_value", Message: "is required when scope is not 'store'"})
		}
	default:
		errs = append(errs, FieldError{Field: "scope", Message: "must be 'store', 'category', or 'product'"})
	}

	if o.StartsAt != nil && o.EndsAt != nil && !o.EndsAt.After(*o.StartsAt) {
		errs = append(errs, FieldError{Field: "ends_at", Message: "must be after starts_at"})
	}

	if len(errs) == 0 {
		return nil
	}
	return errs
}

// CreateOfferRequest is the DTO for offer creation.
type CreateOfferRequest struct {
	Name          string     `json:"name"`
	Description   string     `json:"description"`
	DiscountType  string     `json:"discount_type"`
	DiscountValue Money      `json:"discount_value"`
	Scope         string     `json:"scope"`
	ScopeValue    *string    `json:"scope_value,omitempty"`
	StartsAt      *time.Time `json:"starts_at,omitempty"`
	EndsAt        *time.Time `json:"ends_at,omitempty"`
	Status        string     `json:"status,omitempty"`
}

// UpdateOfferRequest is the DTO for partial offer update (all fields optional).
type UpdateOfferRequest struct {
	Name          *string    `json:"name"`
	Description   *string    `json:"description"`
	DiscountType  *string    `json:"discount_type"`
	DiscountValue *Money     `json:"discount_value"`
	Scope         *string    `json:"scope"`
	ScopeValue    *string    `json:"scope_value"`
	StartsAt      *time.Time `json:"starts_at"`
	EndsAt        *time.Time `json:"ends_at"`
	Status        *string    `json:"status"`
}
