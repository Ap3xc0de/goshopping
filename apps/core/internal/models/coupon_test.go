package models

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestCouponIsActiveAt(t *testing.T) {
	tests := []struct {
		name     string
		coupon   *Coupon
		now      time.Time
		expected bool
	}{
		{
			name: "active coupon, no time window",
			coupon: &Coupon{
				Status:   "active",
				StartsAt: nil,
				EndsAt:   nil,
			},
			now:      time.Now(),
			expected: true,
		},
		{
			name: "inactive coupon",
			coupon: &Coupon{
				Status:   "inactive",
				StartsAt: nil,
				EndsAt:   nil,
			},
			now:      time.Now(),
			expected: false,
		},
		{
			name: "before starts_at",
			coupon: &Coupon{
				Status:   "active",
				StartsAt: ptrTime(time.Now().Add(1 * time.Hour)),
				EndsAt:   nil,
			},
			now:      time.Now(),
			expected: false,
		},
		{
			name: "exactly at starts_at",
			coupon: &Coupon{
				Status:   "active",
				StartsAt: ptrTime(time.Now()),
				EndsAt:   nil,
			},
			now:      time.Now(),
			expected: true,
		},
		{
			name: "after ends_at",
			coupon: &Coupon{
				Status:   "active",
				StartsAt: nil,
				EndsAt:   ptrTime(time.Now().Add(-1 * time.Hour)),
			},
			now:      time.Now(),
			expected: false,
		},
		{
			name: "exactly at ends_at",
			coupon: &Coupon{
				Status:   "active",
				StartsAt: nil,
				EndsAt:   ptrTime(time.Now()),
			},
			now:      time.Now(),
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.coupon.IsActiveAt(tt.now)
			if result != tt.expected {
				t.Errorf("IsActiveAt() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestCouponIsUsageLimitExceeded(t *testing.T) {
	tests := []struct {
		name     string
		coupon   *Coupon
		expected bool
	}{
		{
			name:     "no usage limit",
			coupon:   &Coupon{UsageLimit: nil, UsedCount: 100},
			expected: false,
		},
		{
			name:     "usage below limit",
			coupon:   &Coupon{UsageLimit: ptrInt(10), UsedCount: 5},
			expected: false,
		},
		{
			name:     "usage at limit",
			coupon:   &Coupon{UsageLimit: ptrInt(10), UsedCount: 10},
			expected: true,
		},
		{
			name:     "usage exceeds limit",
			coupon:   &Coupon{UsageLimit: ptrInt(10), UsedCount: 11},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.coupon.IsUsageLimitExceeded()
			if result != tt.expected {
				t.Errorf("IsUsageLimitExceeded() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestCouponValidate(t *testing.T) {
	storeID := uuid.New()

	tests := []struct {
		name    string
		coupon  *Coupon
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid coupon",
			coupon: &Coupon{
				Code:          "SUMMER2024",
				Name:          "Summer Sale",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: false,
		},
		{
			name: "valid fixed coupon",
			coupon: &Coupon{
				Code:          "FIX-100",
				Name:          "Fixed Discount",
				DiscountType:  "fixed",
				DiscountValue: NewMoney(10000),
				UsageType:     "line",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: false,
		},
		{
			name: "code too short",
			coupon: &Coupon{
				Code:          "AB",
				Name:          "Test",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: true,
			errMsg:  "code",
		},
		{
			name: "code with invalid characters",
			coupon: &Coupon{
				Code:          "SUMMER@2024",
				Name:          "Test",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: true,
			errMsg:  "code",
		},
		{
			name: "missing name",
			coupon: &Coupon{
				Code:          "ABC123",
				Name:          "",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: true,
			errMsg:  "name",
		},
		{
			name: "invalid discount type",
			coupon: &Coupon{
				Code:          "ABC123",
				Name:          "Test",
				DiscountType:  "invalid",
				DiscountValue: NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: true,
			errMsg:  "discount_type",
		},
		{
			name: "percentage discount > 100",
			coupon: &Coupon{
				Code:          "ABC123",
				Name:          "Test",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(150),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: true,
			errMsg:  "discount_value",
		},
		{
			name: "zero discount value",
			coupon: &Coupon{
				Code:          "ABC123",
				Name:          "Test",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(0),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: true,
			errMsg:  "discount_value",
		},
		{
			name: "invalid usage type",
			coupon: &Coupon{
				Code:          "ABC123",
				Name:          "Test",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(10),
				UsageType:     "invalid",
				Status:        "active",
				StoreID:       storeID,
			},
			wantErr: true,
			errMsg:  "usage_type",
		},
		{
			name: "ends_at before starts_at",
			coupon: &Coupon{
				Code:          "ABC123",
				Name:          "Test",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
				StartsAt:      ptrTime(time.Now().Add(2 * time.Hour)),
				EndsAt:        ptrTime(time.Now().Add(1 * time.Hour)),
			},
			wantErr: true,
			errMsg:  "ends_at",
		},
		{
			name: "negative usage limit",
			coupon: &Coupon{
				Code:          "ABC123",
				Name:          "Test",
				DiscountType:  "percentage",
				DiscountValue: NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
				StoreID:       storeID,
				UsageLimit:    ptrInt(-1),
			},
			wantErr: true,
			errMsg:  "usage_limit",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.coupon.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && tt.errMsg != "" {
				errStr := err.Error()
				if !contains(errStr, tt.errMsg) {
					t.Errorf("Validate() error does not contain %q: %v", tt.errMsg, errStr)
				}
			}
		})
	}
}

// Helper functions for testing
func ptrTime(t time.Time) *time.Time {
	return &t
}

func ptrInt(i int) *int {
	return &i
}

func contains(s, substr string) bool {
	for i := 0; i < len(s); i++ {
		if len(s[i:]) < len(substr) {
			return false
		}
		match := true
		for j := 0; j < len(substr); j++ {
			if s[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}
