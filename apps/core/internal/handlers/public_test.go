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

func strPtr(s string) *string { return &s }

// findByID returns the map entry in items whose "id" field equals id, or nil.
func findByID(items []interface{}, id string) map[string]interface{} {
	for _, raw := range items {
		item, _ := raw.(map[string]interface{})
		if item["id"] == id {
			return item
		}
	}
	return nil
}

func TestPublicStoreConfig(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	slug := testutil.GetStoreSlug(t, app.DB, mustParseUUID(t, storeID))

	t.Run("returns store config by slug", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, slug, data["slug"])
	})

	t.Run("returns 404 for unknown slug", func(t *testing.T) {
		resp := app.GET(t, "/public/nonexistent-store-slug/config", "")
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("includes a default branding object when none configured", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		_, hasBranding := data["branding"]
		assert.True(t, hasBranding, "response should always include a branding object")
	})

	t.Run("includes saved branding", func(t *testing.T) {
		brandingSvc := services.NewBrandingService(app.DB, app.Config)
		_, err := brandingSvc.UpdateBranding(context.Background(), mustParseUUID(t, storeID),
			models.StoreBranding{BrandName: "Acme"})
		require.NoError(t, err)

		resp := app.GET(t, "/public/"+slug+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		branding, _ := data["branding"].(map[string]interface{})
		assert.Equal(t, "Acme", branding["brand_name"])
	})

	// REQ-RESOLVE-03: template_id is the only field this change adds to the
	// slug endpoint's response — the storefront needs it to pick a template.
	t.Run("includes template_id", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		templateID, ok := data["template_id"]
		assert.True(t, ok, "response must carry a template_id key")
		assert.Equal(t, "minimal", templateID, "new stores default to the 'minimal' template")
	})
}

func TestPublicListProducts(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	t.Run("returns active products without cost", func(t *testing.T) {
		testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Public Product"))
		testutil.CreateTestProduct(t, app.DB, storeIDParsed,
			testutil.WithName("Inactive"), testutil.WithStatus("inactive"))

		resp := app.GET(t, "/public/"+slug+"/products", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 1)

		items, _ := data["data"].([]interface{})
		if len(items) > 0 {
			item, _ := items[0].(map[string]interface{})
			_, hasCost := item["cost"]
			assert.False(t, hasCost, "public endpoint should not expose cost")
		}
	})

	t.Run("includes effective_price and a null active_offer when no offer applies", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed,
			testutil.WithName("No Offer Product"), testutil.WithPrice(20000))

		resp := app.GET(t, "/public/"+slug+"/products", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		items, _ := data["data"].([]interface{})
		found := findByID(items, p.ID.String())
		require.NotNil(t, found, "created product should be present in the public list")

		_, hasEffective := found["effective_price"]
		assert.True(t, hasEffective, "response should include effective_price")
		_, hasActiveOffer := found["active_offer"]
		assert.True(t, hasActiveOffer, "response should include the active_offer key even when null")
		assert.Equal(t, found["price"], found["effective_price"], "effective_price should equal price when no offer applies")
		assert.Nil(t, found["active_offer"])
	})

	t.Run("applies an active category offer and exposes it as active_offer", func(t *testing.T) {
		offerSvc := services.NewOfferService(app.DB)
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed,
			testutil.WithName("Discounted Shoes"), testutil.WithPrice(20000), testutil.WithCategory("shoes-cat"))

		_, err := offerSvc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
			Name:          "Shoes Sale",
			DiscountType:  "percentage",
			DiscountValue: models.NewMoney(10),
			Scope:         "category",
			ScopeValue:    strPtr("shoes-cat"),
		})
		require.NoError(t, err)

		resp := app.GET(t, "/public/"+slug+"/products", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		items, _ := data["data"].([]interface{})
		found := findByID(items, p.ID.String())
		require.NotNil(t, found)

		price, _ := found["price"].(float64)
		effective, hasEffective := found["effective_price"].(float64)
		require.True(t, hasEffective, "effective_price should be a number")
		assert.Less(t, effective, price, "effective_price should be lower than price when an offer applies")
		assert.InDelta(t, 18000, effective, 0.01)

		activeOffer, hasOffer := found["active_offer"].(map[string]interface{})
		require.True(t, hasOffer, "active_offer should be populated")
		assert.Equal(t, "Shoes Sale", activeOffer["name"])
		_, hasStoreID := activeOffer["store_id"]
		assert.False(t, hasStoreID, "active_offer must not leak store_id")
	})
}

func TestPublicGetProduct(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	t.Run("returns 404 for unknown product", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products/00000000-0000-0000-0000-000000000001", "")
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("no applicable offer returns effective_price equal to price and null active_offer", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(10000))

		resp := app.GET(t, "/public/"+slug+"/products/"+p.ID.String(), "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		_, hasEffective := data["effective_price"]
		assert.True(t, hasEffective, "response should include effective_price")
		_, hasActiveOffer := data["active_offer"]
		assert.True(t, hasActiveOffer, "response should include the active_offer key even when null")
		assert.Equal(t, data["price"], data["effective_price"])
		assert.Nil(t, data["active_offer"])
	})

	t.Run("a store-wide offer lowers effective_price and is exposed as active_offer", func(t *testing.T) {
		offerSvc := services.NewOfferService(app.DB)
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(10000))

		_, err := offerSvc.CreateOffer(context.Background(), storeIDParsed, models.CreateOfferRequest{
			Name:          "Store Wide",
			DiscountType:  "fixed",
			DiscountValue: models.NewMoney(1500),
		})
		require.NoError(t, err)

		resp := app.GET(t, "/public/"+slug+"/products/"+p.ID.String(), "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		assert.Equal(t, float64(8500), data["effective_price"])
		activeOffer, hasOffer := data["active_offer"].(map[string]interface{})
		require.True(t, hasOffer)
		assert.Equal(t, "Store Wide", activeOffer["name"])
	})
}

func TestPublicOffersEndpointDoesNotExist(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	slug := testutil.GetStoreSlug(t, app.DB, mustParseUUID(t, storeID))

	// No public offers endpoint is registered. The exact status the global
	// Auth middleware returns for an unmatched "/public/..." path (401, since
	// it intercepts every unmatched route under "/" before a 404 would fire)
	// is incidental; what matters is that no offer data is ever served here.
	resp := app.GET(t, "/public/"+slug+"/offers", "")
	assert.NotEqual(t, http.StatusOK, resp.StatusCode, "no public offers endpoint should ever return data")
}

func TestPublicCreateOrder(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(20))

	t.Run("creates order and returns access_token", func(t *testing.T) {
		body := map[string]interface{}{
			"customer_name":  "Public Customer",
			"customer_phone": "555-0001",
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "quantity": 1},
			},
			"payment_method": "cash",
		}
		resp := app.POST(t, "/public/"+slug+"/orders", body, "")
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		_, hasToken := data["access_token"]
		_, hasOrder := data["order"]
		assert.True(t, hasToken, "should return access_token")
		assert.True(t, hasOrder, "should return order")
	})

	t.Run("returns 422 when no items", func(t *testing.T) {
		body := map[string]interface{}{
			"customer_name": "Test",
			"items":         []interface{}{},
		}
		resp := app.POST(t, "/public/"+slug+"/orders", body, "")
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "items are required")
	})
}
