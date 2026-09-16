package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/shopspring/decimal"
)

// LineItem is a cart item for quote computation (pure data).
type LineItem struct {
	ProductID uuid.UUID
	Quantity  int
	ListPrice models.Money
	Category  string
}

// CartPreview is the computed quote result.
type CartPreview struct {
	Items                  []LineItem
	SubtotalBeforeDiscount models.Money
	EffectiveSubtotal      models.Money
	DiscountTotal          models.Money
	AppliedCoupon          *models.Coupon
	Tax                    models.Money
	Total                  models.Money
}

var (
	ErrCouponNotApplicable = fmt.Errorf("coupon not applicable")
	ErrCouponExpired       = fmt.Errorf("coupon expired or inactive")
	ErrCouponLimitExceeded = fmt.Errorf("coupon usage limit exceeded")
)

// ComputeQuote resolves offers + coupons to generate a complete cart preview.
// Pure function: no DB access. Caller supplies candidate offers, coupon (if any), and now.
// Returns error if coupon validation fails (expired, limit exceeded, etc).
func ComputeQuote(
	items []LineItem,
	offers []models.Offer,
	coupon *models.Coupon,
	now time.Time,
) (*CartPreview, error) {
	if len(items) == 0 {
		return &CartPreview{
			Items:                  items,
			SubtotalBeforeDiscount: models.MoneyZero(),
			EffectiveSubtotal:      models.MoneyZero(),
			DiscountTotal:          models.MoneyZero(),
			AppliedCoupon:          nil,
			Tax:                    models.MoneyZero(),
			Total:                  models.MoneyZero(),
		}, nil
	}

	// Validate coupon if present.
	if coupon != nil {
		if !coupon.IsActiveAt(now) {
			return nil, ErrCouponExpired
		}
		if coupon.IsUsageLimitExceeded() {
			return nil, ErrCouponLimitExceeded
		}
	}

	// Stage 1: Resolve offers per line, compute subtotal before discount.
	subtotalBeforeDiscount := models.MoneyZero()
	resolvedItems := make([]LineItem, len(items))

	for i, item := range items {
		resolvedItems[i] = item
		lineTotal := item.ListPrice.MulInt(item.Quantity)
		subtotalBeforeDiscount = subtotalBeforeDiscount.Add(lineTotal)
	}

	// Stage 2: Apply offers to each line (1 offer per line max, specificity rules).
	effectiveSubtotal := models.MoneyZero()
	offerDiscount := models.MoneyZero()

	for _, item := range resolvedItems {
		effectivePrice := item.ListPrice

		// Resolve offer for this line.
		offer := ResolveOffer(offers, item.ProductID, item.Category, item.ListPrice, now)
		if offer != nil {
			effectivePrice = ApplyOffer(item.ListPrice, offer)
			offerDiscount = offerDiscount.Add(item.ListPrice.Sub(effectivePrice).MulInt(item.Quantity))
		}

		lineTotal := effectivePrice.MulInt(item.Quantity)
		effectiveSubtotal = effectiveSubtotal.Add(lineTotal)
	}

	// Stage 3: Apply coupon (cart or line precedence).
	couponDiscount := models.MoneyZero()
	appliedCoupon := coupon

	if coupon != nil && coupon.UsageType == "cart" {
		// Cart coupon applies to entire cart after offers.
		discount := computeCouponDiscount(effectiveSubtotal, coupon)
		couponDiscount = discount
		effectiveSubtotal = effectiveSubtotal.Sub(discount)
	}
	// Note: line coupons are out of scope for this slice (REQ-COUPON-02 mentions but slice 4 does cart-scope only).

	// Stage 4: Compute discount total, tax (on effective), total.
	discountTotal := offerDiscount.Add(couponDiscount)
	tax := effectiveSubtotal.Mul(IVARate).Round2()
	total := effectiveSubtotal.Add(tax)

	return &CartPreview{
		Items:                  resolvedItems,
		SubtotalBeforeDiscount: subtotalBeforeDiscount,
		EffectiveSubtotal:      effectiveSubtotal,
		DiscountTotal:          discountTotal,
		AppliedCoupon:          appliedCoupon,
		Tax:                    tax,
		Total:                  total,
	}, nil
}

// computeCouponDiscount returns the absolute discount a coupon yields against subtotal.
func computeCouponDiscount(subtotal models.Money, coupon *models.Coupon) models.Money {
	if coupon == nil {
		return models.MoneyZero()
	}
	switch coupon.DiscountType {
	case "percentage":
		percentDiscount := subtotal.Mul(coupon.DiscountValue.Decimal).Div(decimal.NewFromInt(100))
		return models.Money{Decimal: percentDiscount.Round(2)}
	case "fixed":
		// Fixed discount cannot exceed subtotal.
		discount := coupon.DiscountValue
		if discount.Decimal.GreaterThan(subtotal.Decimal) {
			return subtotal
		}
		return discount
	default:
		return models.MoneyZero()
	}
}
