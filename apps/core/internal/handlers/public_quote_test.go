package handlers_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPublicQuoteCart covers the fix for quote_resolver.go's CartPreview (and
// LineItem) missing JSON tags, which made POST /public/:storeSlug/quote emit
// PascalCase keys (Items, SubtotalBeforeDiscount, ...) instead of the
// snake_case shape every other public endpoint uses. applied_coupon carries
// `omitempty` (it is nil whenever no coupon is applied), so it is asserted
// separately from the always-present keys.
func TestPublicQuoteCart(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	t.Run("without a coupon returns snake_case keys and omits applied_coupon", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(10000), testutil.WithStock(10))

		body := map[string]interface{}{
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "quantity": 2},
			},
		}
		resp := app.POST(t, "/public/"+slug+"/quote", body, "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		snakeCaseKeys := []string{
			"items", "subtotal_before_discount", "effective_subtotal",
			"discount_total", "tax", "total",
		}
		for _, key := range snakeCaseKeys {
			_, ok := data[key]
			assert.True(t, ok, "response should include snake_case key %q", key)
		}

		_, hasAppliedCoupon := data["applied_coupon"]
		assert.False(t, hasAppliedCoupon, "applied_coupon should be omitted (omitempty) when no coupon is applied")

		pascalCaseKeys := []string{
			"Items", "SubtotalBeforeDiscount", "EffectiveSubtotal",
			"DiscountTotal", "AppliedCoupon", "Tax", "Total",
		}
		for _, key := range pascalCaseKeys {
			_, ok := data[key]
			assert.False(t, ok, "response should not include PascalCase key %q", key)
		}

		items, ok := data["items"].([]interface{})
		assert.True(t, ok, "items should be an array")
		if assert.Len(t, items, 1) {
			item, _ := items[0].(map[string]interface{})
			itemKeys := []string{"product_id", "quantity", "list_price"}
			for _, key := range itemKeys {
				_, ok := item[key]
				assert.True(t, ok, "line item should include snake_case key %q", key)
			}
			_, hasProductID := item["ProductID"]
			assert.False(t, hasProductID, "line item should not include PascalCase key \"ProductID\"")
		}
	})

	t.Run("with a coupon returns applied_coupon in snake_case", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(10000), testutil.WithStock(10))

		couponSvc := services.NewCouponService(app.DB)
		_, err := couponSvc.CreateCoupon(context.Background(), storeIDParsed, models.CreateCouponRequest{
			Code:          "QUOTE10",
			Name:          "Quote Test Coupon",
			DiscountType:  "percentage",
			DiscountValue: models.NewMoney(10),
			UsageType:     "cart",
			Status:        "active",
		})
		require.NoError(t, err)

		body := map[string]interface{}{
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "quantity": 1},
			},
			"coupon_code": "QUOTE10",
		}
		resp := app.POST(t, "/public/"+slug+"/quote", body, "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		appliedCoupon, ok := data["applied_coupon"].(map[string]interface{})
		require.True(t, ok, "applied_coupon should be present as an object when a coupon is applied")
		assert.Equal(t, "QUOTE10", appliedCoupon["code"])
		_, hasPascalCode := appliedCoupon["Code"]
		assert.False(t, hasPascalCode, "applied_coupon should not include PascalCase key \"Code\"")
	})
}
