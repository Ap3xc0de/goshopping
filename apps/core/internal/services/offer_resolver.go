package services

import (
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/shopspring/decimal"
)

// specificity ranks scope precedence per REQ-OFFER-02: product > category > store.
func specificity(scope string) int {
	switch scope {
	case "product":
		return 3
	case "category":
		return 2
	case "store":
		return 1
	default:
		return 0
	}
}

// discountAmount computes the absolute discount offer yields against listPrice.
func discountAmount(listPrice models.Money, offer models.Offer) decimal.Decimal {
	switch offer.DiscountType {
	case "percentage":
		return listPrice.Decimal.Mul(offer.DiscountValue.Decimal).Div(decimal.NewFromInt(100))
	case "fixed":
		return offer.DiscountValue.Decimal
	default:
		return decimal.Zero
	}
}

// ResolveOffer returns the single offer applicable to a product per
// REQ-OFFER-02: offers never stack, precedence is product > category > store,
// and within the winning specificity tier the offer with the largest
// computed discount (on listPrice) wins. Exact ties are broken deterministically
// by lowest offer ID so the result is reproducible regardless of input order.
// Returns nil if no offer applies. Pure: the caller supplies the candidate
// offers and the instant "now" — no DB access happens here.
func ResolveOffer(offers []models.Offer, productID uuid.UUID, category string, listPrice models.Money, now time.Time) *models.Offer {
	var candidates []models.Offer
	for _, o := range offers {
		if !o.IsActiveAt(now) {
			continue
		}
		switch o.Scope {
		case "store":
			candidates = append(candidates, o)
		case "category":
			if o.ScopeValue != nil && *o.ScopeValue == category {
				candidates = append(candidates, o)
			}
		case "product":
			if o.ScopeValue != nil && *o.ScopeValue == productID.String() {
				candidates = append(candidates, o)
			}
		}
	}
	if len(candidates) == 0 {
		return nil
	}

	bestSpecificity := 0
	for _, o := range candidates {
		if s := specificity(o.Scope); s > bestSpecificity {
			bestSpecificity = s
		}
	}

	var winner *models.Offer
	var winnerDiscount decimal.Decimal
	for i := range candidates {
		if specificity(candidates[i].Scope) != bestSpecificity {
			continue
		}
		discount := discountAmount(listPrice, candidates[i])
		if winner == nil ||
			discount.GreaterThan(winnerDiscount) ||
			(discount.Equal(winnerDiscount) && candidates[i].ID.String() < winner.ID.String()) {
			winner = &candidates[i]
			winnerDiscount = discount
		}
	}
	return winner
}

// ApplyOffer returns the effective price after applying offer to listPrice,
// floored at 0. Returns listPrice unchanged if offer is nil.
func ApplyOffer(listPrice models.Money, offer *models.Offer) models.Money {
	if offer == nil {
		return listPrice
	}
	result := listPrice.Decimal.Sub(discountAmount(listPrice, *offer))
	if result.IsNegative() {
		result = decimal.Zero
	}
	return models.Money{Decimal: result.Round(2)}
}
