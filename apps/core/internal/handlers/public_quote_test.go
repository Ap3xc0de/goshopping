package handlers_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"
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

// product-variants REQ: Variant-Aware Quote — items MAY include variant_id;
// price and stock checks then use the variant (price_override with product-
// level fallback). Unknown or mismatched variant_id is 422; items without
// variant_id keep product-level behavior (legacy clients).
func TestPublicQuoteVariant(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(100), testutil.WithStock(10))
	v := testutil.CreateTestVariant(t, app.DB, storeIDParsed, p.ID,
		testutil.WithVariantSKU("HALTER-XL"), testutil.WithVariantPrice(80), testutil.WithVariantStock(2))
	other := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(300), testutil.WithStock(5))
	otherV := testutil.CreateTestVariant(t, app.DB, storeIDParsed, other.ID,
		testutil.WithVariantPrice(250), testutil.WithVariantStock(1))

	t.Run("quotes a variant at its override price", func(t *testing.T) {
		body := map[string]interface{}{
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "variant_id": v.ID.String(), "quantity": 1},
			},
		}
		resp := app.POST(t, "/public/"+slug+"/quote", body, "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		items, ok := data["items"].([]interface{})
		require.True(t, ok)
		require.Len(t, items, 1)
		item, _ := items[0].(map[string]interface{})
		assert.Equal(t, float64(80), item["list_price"], "quote must price by the variant")
		assert.Equal(t, float64(80), data["subtotal_before_discount"])
		total, _ := data["total"].(float64)
		assert.InDelta(t, 95.20, total, 0.01, "total = variant price + 19%% IVA")
	})

	t.Run("omitted variant_id keeps product-level pricing", func(t *testing.T) {
		body := map[string]interface{}{
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "quantity": 1},
			},
		}
		resp := app.POST(t, "/public/"+slug+"/quote", body, "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		items, _ := data["items"].([]interface{})
		require.Len(t, items, 1)
		item, _ := items[0].(map[string]interface{})
		assert.Equal(t, float64(100), item["list_price"], "no variant_id = product price (backwards compatible)")
	})

	t.Run("unknown variant_id returns 422", func(t *testing.T) {
		body := map[string]interface{}{
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "variant_id": uuid.New().String(), "quantity": 1},
			},
		}
		resp := app.POST(t, "/public/"+slug+"/quote", body, "")
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "variant")
	})

	t.Run("variant of another product returns 422", func(t *testing.T) {
		body := map[string]interface{}{
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "variant_id": otherV.ID.String(), "quantity": 1},
			},
		}
		resp := app.POST(t, "/public/"+slug+"/quote", body, "")
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "variant")
	})

	t.Run("quantity above variant stock returns 422", func(t *testing.T) {
		body := map[string]interface{}{
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "variant_id": v.ID.String(), "quantity": 3},
			},
		}
		resp := app.POST(t, "/public/"+slug+"/quote", body, "")
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "stock")
	})
}
