package services

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
)

func TestComputeQuote(t *testing.T) {
	storeID := uuid.New()
	prodID1 := uuid.New()
	prodID2 := uuid.New()
	now := time.Now()

	tests := []struct {
		name         string
		items        []LineItem
		offers       []models.Offer
		coupon       *models.Coupon
		now          time.Time
		wantErr      bool
		checkResults func(t *testing.T, preview *CartPreview)
	}{
		{
			name: "no items no coupon",
			items: []LineItem{
				{ProductID: prodID1, Quantity: 2, ListPrice: models.NewMoney(10000), Category: "general"},
			},
			offers: []models.Offer{},
			coupon: nil,
			now:    now,
			checkResults: func(t *testing.T, preview *CartPreview) {
				// subtotal = 10000 * 2 = 20000
				// discount_total = 0
				// tax = 20000 * 0.19 = 3800
				// total = 20000 + 3800 = 23800
				if !preview.EffectiveSubtotal.Equal(models.NewMoney(20000).Decimal) {
					t.Errorf("effective_subtotal = %v, want 20000", preview.EffectiveSubtotal)
				}
				if !preview.DiscountTotal.Equal(models.MoneyZero().Decimal) {
					t.Errorf("discount_total = %v, want 0", preview.DiscountTotal)
				}
				if !preview.Total.Equal(models.NewMoney(23800).Decimal) {
					t.Errorf("total = %v, want 23800", preview.Total)
				}
			},
		},
		{
			name: "with offer, no coupon",
			items: []LineItem{
				{ProductID: prodID1, Quantity: 1, ListPrice: models.NewMoney(10000), Category: "general"},
			},
			offers: []models.Offer{
				{
					ID:            uuid.New(),
					StoreID:       storeID,
					DiscountType:  "percentage",
					DiscountValue: models.NewMoney(10),
					Scope:         "store",
					Status:        "active",
					StartsAt:      nil,
					EndsAt:        nil,
				},
			},
			coupon: nil,
			now:    now,
			checkResults: func(t *testing.T, preview *CartPreview) {
				// offer: 10% of 10000 = 1000
				// effective_price = 10000 - 1000 = 9000
				// subtotal = 9000
				// tax = 9000 * 0.19 = 1710
				// total = 9000 + 1710 = 10710
				if !preview.EffectiveSubtotal.Equal(models.NewMoney(9000).Decimal) {
					t.Errorf("effective_subtotal = %v, want 9000", preview.EffectiveSubtotal)
				}
				if !preview.DiscountTotal.Equal(models.NewMoney(1000).Decimal) {
					t.Errorf("discount_total = %v, want 1000", preview.DiscountTotal)
				}
				if !preview.Total.Equal(models.NewMoney(10710).Decimal) {
					t.Errorf("total = %v, want 10710", preview.Total)
				}
			},
		},
		{
			name: "with cart coupon, no offer",
			items: []LineItem{
				{ProductID: prodID1, Quantity: 1, ListPrice: models.NewMoney(10000), Category: "general"},
			},
			offers: []models.Offer{},
			coupon: &models.Coupon{
				ID:            uuid.New(),
				StoreID:       storeID,
				Code:          "SUMMER10",
				DiscountType:  "percentage",
				DiscountValue: models.NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StartsAt:      nil,
				EndsAt:        nil,
				UsedCount:     0,
				UsageLimit:    nil,
			},
			now: now,
			checkResults: func(t *testing.T, preview *CartPreview) {
				// coupon (cart): 10% of 10000 = 1000
				// effective_subtotal = 10000 - 1000 = 9000
				// tax = 9000 * 0.19 = 1710
				// total = 9000 + 1710 = 10710
				if !preview.EffectiveSubtotal.Equal(models.NewMoney(9000).Decimal) {
					t.Errorf("effective_subtotal = %v, want 9000", preview.EffectiveSubtotal)
				}
				if !preview.DiscountTotal.Equal(models.NewMoney(1000).Decimal) {
					t.Errorf("discount_total = %v, want 1000", preview.DiscountTotal)
				}
				if preview.AppliedCoupon == nil || preview.AppliedCoupon.Code != "SUMMER10" {
					t.Errorf("applied_coupon not set or wrong code")
				}
			},
		},
		{
			name: "with offer and cart coupon (offer applies first, then coupon)",
			items: []LineItem{
				{ProductID: prodID1, Quantity: 1, ListPrice: models.NewMoney(10000), Category: "general"},
			},
			offers: []models.Offer{
				{
					ID:            uuid.New(),
					StoreID:       storeID,
					DiscountType:  "fixed",
					DiscountValue: models.NewMoney(1000),
					Scope:         "product",
					ScopeValue:    ptrString(prodID1.String()),
					Status:        "active",
					StartsAt:      nil,
					EndsAt:        nil,
				},
			},
			coupon: &models.Coupon{
				ID:            uuid.New(),
				StoreID:       storeID,
				Code:          "SUMMER5",
				DiscountType:  "percentage",
				DiscountValue: models.NewMoney(5),
				UsageType:     "cart",
				Status:        "active",
				StartsAt:      nil,
				EndsAt:        nil,
				UsedCount:     0,
				UsageLimit:    nil,
			},
			now: now,
			checkResults: func(t *testing.T, preview *CartPreview) {
				// offer: 1000 fixed
				// after offer: 10000 - 1000 = 9000
				// coupon (cart): 5% of 9000 = 450
				// effective_subtotal = 9000 - 450 = 8550
				// tax = 8550 * 0.19 = 1624.50
				// total = 8550 + 1624.50 = 10174.50
				if !preview.EffectiveSubtotal.Equal(models.NewMoney(8550).Decimal) {
					t.Errorf("effective_subtotal = %v, want 8550", preview.EffectiveSubtotal)
				}
				if !preview.DiscountTotal.Equal(models.NewMoney(1450).Decimal) {
					t.Errorf("discount_total = %v, want 1450", preview.DiscountTotal)
				}
				expectedTotal := models.NewMoney(8550).Add(models.NewMoney(1624.50))
				if !preview.Total.Equal(expectedTotal.Decimal) {
					t.Errorf("total = %v, want %v", preview.Total, expectedTotal)
				}
			},
		},
		{
			name: "expired coupon should error",
			items: []LineItem{
				{ProductID: prodID1, Quantity: 1, ListPrice: models.NewMoney(10000), Category: "general"},
			},
			offers: []models.Offer{},
			coupon: &models.Coupon{
				ID:            uuid.New(),
				StoreID:       storeID,
				Code:          "EXPIRED",
				DiscountType:  "percentage",
				DiscountValue: models.NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StartsAt:      nil,
				EndsAt:        timePtr(now.Add(-1 * time.Hour)),
				UsedCount:     0,
				UsageLimit:    nil,
			},
			now:     now,
			wantErr: true,
		},
		{
			name: "coupon at usage limit should error",
			items: []LineItem{
				{ProductID: prodID1, Quantity: 1, ListPrice: models.NewMoney(10000), Category: "general"},
			},
			offers: []models.Offer{},
			coupon: &models.Coupon{
				ID:            uuid.New(),
				StoreID:       storeID,
				Code:          "LIMITED",
				DiscountType:  "percentage",
				DiscountValue: models.NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StartsAt:      nil,
				EndsAt:        nil,
				UsedCount:     5,
				UsageLimit:    ptrInt(5),
			},
			now:     now,
			wantErr: true,
		},
		{
			name: "multiple items with offers and cart coupon",
			items: []LineItem{
				{ProductID: prodID1, Quantity: 2, ListPrice: models.NewMoney(10000), Category: "general"},
				{ProductID: prodID2, Quantity: 1, ListPrice: models.NewMoney(5000), Category: "special"},
			},
			offers: []models.Offer{
				{
					ID:            uuid.New(),
					StoreID:       storeID,
					DiscountType:  "percentage",
					DiscountValue: models.NewMoney(10),
					Scope:         "store",
					Status:        "active",
					StartsAt:      nil,
					EndsAt:        nil,
				},
			},
			coupon: &models.Coupon{
				ID:            uuid.New(),
				StoreID:       storeID,
				Code:          "MULTI",
				DiscountType:  "fixed",
				DiscountValue: models.NewMoney(2000),
				UsageType:     "cart",
				Status:        "active",
				StartsAt:      nil,
				EndsAt:        nil,
				UsedCount:     0,
				UsageLimit:    nil,
			},
			now: now,
			checkResults: func(t *testing.T, preview *CartPreview) {
				// items before discount: 10000*2 + 5000 = 25000
				// offer (store, 10%): 2500 discount
				// after offer: 25000 - 2500 = 22500
				// coupon (cart, fixed 2000):
				// after coupon: 22500 - 2000 = 20500
				// tax = 20500 * 0.19 = 3895
				// total = 20500 + 3895 = 24395
				if !preview.EffectiveSubtotal.Equal(models.NewMoney(20500).Decimal) {
					t.Errorf("effective_subtotal = %v, want 20500", preview.EffectiveSubtotal)
				}
				if !preview.DiscountTotal.Equal(models.NewMoney(4500).Decimal) {
					t.Errorf("discount_total = %v, want 4500", preview.DiscountTotal)
				}
				if !preview.Total.Equal(models.NewMoney(24395).Decimal) {
					t.Errorf("total = %v, want 24395", preview.Total)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			preview, err := ComputeQuote(tt.items, tt.offers, tt.coupon, tt.now)
			if (err != nil) != tt.wantErr {
				t.Errorf("ComputeQuote() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err == nil && tt.checkResults != nil {
				tt.checkResults(t, preview)
			}
		})
	}
}

// Helper functions for testing
func ptrString(s string) *string {
	return &s
}

func ptrInt(i int) *int {
	return &i
}

func timePtr(t time.Time) *time.Time {
	return &t
}
