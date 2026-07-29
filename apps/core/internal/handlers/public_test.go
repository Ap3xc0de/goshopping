package handlers_test

import (
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

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
