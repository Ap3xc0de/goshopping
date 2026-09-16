package models_test

import (
	"testing"
	"time"

	"github.com/goshopping/core/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func strPtr(s string) *string { return &s }

func baseOffer() models.Offer {
	return models.Offer{
		Name:          "Test Offer",
		DiscountType:  "percentage",
		DiscountValue: models.NewMoney(10),
		Scope:         "store",
		Status:        "active",
	}
}

func TestOffer_IsActiveAt(t *testing.T) {
	now := time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC)
	past := now.Add(-24 * time.Hour)
	future := now.Add(24 * time.Hour)

	tests := []struct {
		name     string
		status   string
		startsAt *time.Time
		endsAt   *time.Time
		want     bool
	}{
		{"active, unbounded window", "active", nil, nil, true},
		{"active, within window", "active", &past, &future, true},
		{"active, not started yet", "active", &future, nil, false},
		{"active, already expired", "active", nil, &past, false},
		{"inactive status ignores window", "inactive", nil, nil, false},
		{"inactive status even within window", "inactive", &past, &future, false},
		{"boundary: exactly at starts_at", "active", &now, nil, true},
		{"boundary: exactly at ends_at", "active", nil, &now, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			o := baseOffer()
			o.Status = tt.status
			o.StartsAt = tt.startsAt
			o.EndsAt = tt.endsAt
			assert.Equal(t, tt.want, o.IsActiveAt(now))
		})
	}
}

func TestOffer_Validate(t *testing.T) {
	t.Run("valid minimal store-scope offer passes", func(t *testing.T) {
		o := baseOffer()
		assert.NoError(t, o.Validate())
	})

	t.Run("missing name is rejected", func(t *testing.T) {
		o := baseOffer()
		o.Name = ""
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "name")
	})

	t.Run("invalid discount_type is rejected", func(t *testing.T) {
		o := baseOffer()
		o.DiscountType = "bogus"
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "discount_type")
	})

	t.Run("zero discount_value is rejected", func(t *testing.T) {
		o := baseOffer()
		o.DiscountValue = models.MoneyZero()
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "discount_value")
	})

	t.Run("negative discount_value is rejected", func(t *testing.T) {
		o := baseOffer()
		o.DiscountValue = models.NewMoney(-5)
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "discount_value")
	})

	t.Run("percentage over 100 is rejected", func(t *testing.T) {
		o := baseOffer()
		o.DiscountType = "percentage"
		o.DiscountValue = models.NewMoney(150)
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "discount_value")
	})

	t.Run("percentage exactly 100 is accepted", func(t *testing.T) {
		o := baseOffer()
		o.DiscountType = "percentage"
		o.DiscountValue = models.NewMoney(100)
		assert.NoError(t, o.Validate())
	})

	t.Run("fixed discount over 100 is accepted (no percentage cap)", func(t *testing.T) {
		o := baseOffer()
		o.DiscountType = "fixed"
		o.DiscountValue = models.NewMoney(500)
		assert.NoError(t, o.Validate())
	})

	t.Run("category scope without scope_value is rejected", func(t *testing.T) {
		o := baseOffer()
		o.Scope = "category"
		o.ScopeValue = nil
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "scope_value")
	})

	t.Run("product scope without scope_value is rejected", func(t *testing.T) {
		o := baseOffer()
		o.Scope = "product"
		o.ScopeValue = nil
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "scope_value")
	})

	t.Run("category scope with scope_value is accepted", func(t *testing.T) {
		o := baseOffer()
		o.Scope = "category"
		o.ScopeValue = strPtr("shoes")
		assert.NoError(t, o.Validate())
	})

	t.Run("invalid scope is rejected", func(t *testing.T) {
		o := baseOffer()
		o.Scope = "bogus"
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "scope")
	})

	t.Run("ends_at before starts_at is rejected", func(t *testing.T) {
		o := baseOffer()
		start := time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC)
		end := start.Add(-time.Hour)
		o.StartsAt = &start
		o.EndsAt = &end
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ends_at")
	})

	t.Run("ends_at equal to starts_at is rejected", func(t *testing.T) {
		o := baseOffer()
		start := time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC)
		o.StartsAt = &start
		o.EndsAt = &start
		err := o.Validate()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ends_at")
	})

	t.Run("multiple invalid fields are all reported together", func(t *testing.T) {
		o := baseOffer()
		o.Name = ""
		o.DiscountType = "bogus"
		err := o.Validate()
		require.Error(t, err)
		msg := err.Error()
		assert.Contains(t, msg, "name")
		assert.Contains(t, msg, "discount_type")
	})
}
