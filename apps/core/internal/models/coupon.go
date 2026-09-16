package models

import (
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Coupon represents a discount coupon applicable to orders at store scope.
type Coupon struct {
	ID            uuid.UUID  `json:"id"`
	StoreID       uuid.UUID  `json:"store_id"`
	Code          string     `json:"code"`
	Name          string     `json:"name"`
	Description   string     `json:"description"`
	DiscountType  string     `json:"discount_type"` // "percentage" | "fixed"
	DiscountValue Money      `json:"discount_value"`
	UsageType     string     `json:"usage_type"` // "line" | "cart"
	StartsAt      *time.Time `json:"starts_at,omitempty"`
	EndsAt        *time.Time `json:"ends_at,omitempty"`
	UsageLimit    *int       `json:"usage_limit,omitempty"`
	UsedCount     int        `json:"used_count"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// IsActiveAt reports whether the coupon is enabled and within its time window at t.
// A nil StartsAt/EndsAt is unbounded on that side. Both boundaries are inclusive.
func (c *Coupon) IsActiveAt(t time.Time) bool {
	if c.Status != "active" {
		return false
	}
	if c.StartsAt != nil && t.Before(*c.StartsAt) {
		return false
	}
	if c.EndsAt != nil && t.After(*c.EndsAt) {
		return false
	}
	return true
}

// IsUsageLimitExceeded reports whether the coupon has reached its usage limit.
func (c *Coupon) IsUsageLimitExceeded() bool {
	if c.UsageLimit == nil {
		return false
	}
	return c.UsedCount >= *c.UsageLimit
}

// Validate checks the coupon's own invariants, independent of persistence.
func (c *Coupon) Validate() error {
	var errs ValidationErrors

	if strings.TrimSpace(c.Code) == "" {
		errs = append(errs, FieldError{Field: "code", Message: "is required"})
	} else if !isValidCouponCode(c.Code) {
		errs = append(errs, FieldError{Field: "code", Message: "must be 3-20 alphanumeric characters with optional hyphens"})
	}

	if strings.TrimSpace(c.Name) == "" {
		errs = append(errs, FieldError{Field: "name", Message: "is required"})
	}

	switch c.DiscountType {
	case "percentage", "fixed":
	default:
		errs = append(errs, FieldError{Field: "discount_type", Message: "must be 'percentage' or 'fixed'"})
	}

	if !c.DiscountValue.IsPositive() {
		errs = append(errs, FieldError{Field: "discount_value", Message: "must be greater than 0"})
	}
	if c.DiscountType == "percentage" && c.DiscountValue.GreaterThan(decimal.NewFromInt(100)) {
		errs = append(errs, FieldError{Field: "discount_value", Message: "percentage discount cannot exceed 100"})
	}

	switch c.UsageType {
	case "line", "cart":
	default:
		errs = append(errs, FieldError{Field: "usage_type", Message: "must be 'line' or 'cart'"})
	}

	if c.StartsAt != nil && c.EndsAt != nil && !c.EndsAt.After(*c.StartsAt) {
		errs = append(errs, FieldError{Field: "ends_at", Message: "must be after starts_at"})
	}

	if c.UsageLimit != nil && *c.UsageLimit <= 0 {
		errs = append(errs, FieldError{Field: "usage_limit", Message: "must be greater than 0"})
	}

	if len(errs) == 0 {
		return nil
	}
	return errs
}

// isValidCouponCode checks coupon code format: [A-Z0-9][-A-Z0-9]*[A-Z0-9], 3-20 chars.
func isValidCouponCode(code string) bool {
	if len(code) < 3 || len(code) > 20 {
		return false
	}
	re := regexp.MustCompile(`^[A-Z0-9][-A-Z0-9]*[A-Z0-9]$|^[A-Z0-9]$`)
	return re.MatchString(code)
}

// CreateCouponRequest is the DTO for coupon creation.
type CreateCouponRequest struct {
	Code          string     `json:"code"`
	Name          string     `json:"name"`
	Description   string     `json:"description"`
	DiscountType  string     `json:"discount_type"`
	DiscountValue Money      `json:"discount_value"`
	UsageType     string     `json:"usage_type"`
	StartsAt      *time.Time `json:"starts_at,omitempty"`
	EndsAt        *time.Time `json:"ends_at,omitempty"`
	UsageLimit    *int       `json:"usage_limit,omitempty"`
	Status        string     `json:"status,omitempty"`
}

// UpdateCouponRequest is the DTO for coupon updates.
type UpdateCouponRequest struct {
	Name        string     `json:"name,omitempty"`
	Description string     `json:"description,omitempty"`
	UsageType   string     `json:"usage_type,omitempty"`
	StartsAt    *time.Time `json:"starts_at,omitempty"`
	EndsAt      *time.Time `json:"ends_at,omitempty"`
	UsageLimit  *int       `json:"usage_limit,omitempty"`
	Status      string     `json:"status,omitempty"`
}
