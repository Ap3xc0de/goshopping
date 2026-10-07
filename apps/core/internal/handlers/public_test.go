package handlers_test

import (
	"context"
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
		// Profile fields are present and empty when not set.
		assert.Equal(t, "", data["logo_url"])
		assert.Equal(t, "", data["description"])
		assert.Equal(t, "", data["category"])
	})

	t.Run("returns store profile fields when set", func(t *testing.T) {
		if _, err := app.DB.Exec(context.Background(), `
			UPDATE stores SET logo_url = 'https://cdn.example.com/logo.png', description = 'About us', category = 'fashion'
			WHERE slug = $1`, slug); err != nil {
			t.Fatalf("update store profile: %v", err)
		}
		resp := app.GET(t, "/public/"+slug+"/config", "")
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "https://cdn.example.com/logo.png", data["logo_url"])
		assert.Equal(t, "About us", data["description"])
		assert.Equal(t, "fashion", data["category"])
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

func TestPublicListProductsPagination(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	for _, name := range []string{"Alpha", "Bravo", "Charlie"} {
		testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName(name), testutil.WithCategory("cat-"+name))
	}

	get := func(t *testing.T, query string) map[string]interface{} {
		t.Helper()
		resp := app.GET(t, "/public/"+slug+"/products"+query, "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		return testutil.AssertJSON(t, resp)
	}

	t.Run("defaults to page 1 and per_page 50", func(t *testing.T) {
		data := get(t, "")
		assert.EqualValues(t, 1, data["page"])
		assert.EqualValues(t, 50, data["per_page"])
	})

	t.Run("honors page and per_page", func(t *testing.T) {
		data := get(t, "?per_page=2&page=2")
		assert.EqualValues(t, 2, data["page"])
		assert.EqualValues(t, 2, data["per_page"])
		assert.EqualValues(t, 3, data["total"])
		assert.EqualValues(t, 2, data["total_pages"])
		items, _ := data["data"].([]interface{})
		assert.Len(t, items, 1)
	})

	t.Run("caps per_page at 100", func(t *testing.T) {
		data := get(t, "?per_page=500")
		assert.EqualValues(t, 100, data["per_page"])
	})

	t.Run("invalid values fall back to defaults", func(t *testing.T) {
		for _, q := range []string{"?page=0&per_page=0", "?page=-1&per_page=-5", "?page=abc&per_page=xyz"} {
			data := get(t, q)
			assert.EqualValues(t, 1, data["page"], q)
			assert.EqualValues(t, 50, data["per_page"], q)
		}
	})

	t.Run("category and search still work with pagination", func(t *testing.T) {
		data := get(t, "?category=cat-Bravo&per_page=10")
		testutil.AssertPaginated(t, data, 1)
		data = get(t, "?search=charl&per_page=10")
		testutil.AssertPaginated(t, data, 1)
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
