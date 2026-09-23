package handlers_test

import (
	"context"
	"encoding/json"
	"io"
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

// TestPublicListProductsPagination covers the fix for public.go's
// PublicListProducts hardcoding page=1, per_page=50 regardless of query
// params. Mirrors the admin ListProducts handler's parsing, but with
// public-safe bounds: default page=1, default per_page=24, per_page clamped
// to [1,100], invalid/non-numeric input falls back to defaults (no 400).
func TestPublicListProductsPagination(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	t.Run("no query params defaults to page 1 and per_page 24", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(1), data["page"])
		assert.Equal(t, float64(24), data["per_page"])
	})

	t.Run("per_page above 100 is clamped to 100", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products?per_page=999", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(100), data["per_page"])
	})

	t.Run("non-numeric per_page falls back to default 24", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products?per_page=abc", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(24), data["per_page"])
	})

	t.Run("page and per_page are honored across pages", func(t *testing.T) {
		a := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Pagination A"))
		b := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Pagination B"))

		page1Resp := app.GET(t, "/public/"+slug+"/products?page=1&per_page=1", "")
		testutil.AssertStatus(t, page1Resp, http.StatusOK)
		page1 := testutil.AssertJSON(t, page1Resp)
		page1Items, _ := page1["data"].([]interface{})
		require.Len(t, page1Items, 1, "per_page=1 should return exactly one item")
		assert.Equal(t, float64(1), page1["page"])
		assert.Equal(t, float64(1), page1["per_page"])

		page2Resp := app.GET(t, "/public/"+slug+"/products?page=2&per_page=1", "")
		testutil.AssertStatus(t, page2Resp, http.StatusOK)
		page2 := testutil.AssertJSON(t, page2Resp)
		page2Items, _ := page2["data"].([]interface{})
		require.Len(t, page2Items, 1, "per_page=1 should return exactly one item")
		assert.Equal(t, float64(2), page2["page"], "page field should reflect the requested page")

		page1Item, _ := page1Items[0].(map[string]interface{})
		page2Item, _ := page2Items[0].(map[string]interface{})
		assert.NotEqual(t, page1Item["id"], page2Item["id"], "page 1 and page 2 must return different products")

		gotIDs := map[string]bool{page1Item["id"].(string): true, page2Item["id"].(string): true}
		assert.True(t, gotIDs[a.ID.String()], "seeded product A should appear across the two pages")
		assert.True(t, gotIDs[b.ID.String()], "seeded product B should appear across the two pages")
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

// TestPublicOrderStatus covers CORE-04/CORE-05: the ?token= query param
// (already aligned with the SDK's fix, see design decision 6) must resolve
// the order, and the response must include order_number, items, and
// payment_status alongside status/total (CORE-04).
func TestPublicOrderStatus(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(5))

	createBody := map[string]interface{}{
		"customer_name":  "Status Customer",
		"customer_email": "status@test.com",
		"items": []map[string]interface{}{
			{"product_id": p.ID.String(), "quantity": 2},
		},
		"payment_method": "cash",
	}
	createResp := app.POST(t, "/public/"+slug+"/orders", createBody, "")
	testutil.AssertStatus(t, createResp, http.StatusCreated)
	created := testutil.AssertJSON(t, createResp)

	token, ok := created["access_token"].(string)
	require.True(t, ok, "create order response should include access_token")
	orderData, ok := created["order"].(map[string]interface{})
	require.True(t, ok, "create order response should include order")
	orderID, ok := orderData["id"].(string)
	require.True(t, ok, "order should include id")

	t.Run("resolves the order with a matching ?token=", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/orders/"+orderID+"/status?token="+token, "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)

		assert.Equal(t, "pending", data["status"])
		assert.Equal(t, "pending", data["payment_status"], "response should include payment_status")

		orderNumber, hasOrderNumber := data["order_number"]
		assert.True(t, hasOrderNumber, "response should include order_number")
		assert.NotEmpty(t, orderNumber)

		items, hasItems := data["items"].([]interface{})
		assert.True(t, hasItems, "response should include items")
		require.Len(t, items, 1)
		item, _ := items[0].(map[string]interface{})
		assert.Equal(t, float64(2), item["quantity"])
	})

	t.Run("returns 401 without a token", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/orders/"+orderID+"/status", "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})
}

// catalog-browsing REQ: Server-Side Sort Whitelist - the public handler must
// reject unknown sort values with 400 naming the allowed ones.
func TestPublicListProductsSortValidation(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	t.Run("unknown sort returns 400 naming allowed values", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products?sort=popularity", "")
		testutil.AssertStatus(t, resp, http.StatusBadRequest)
		data := testutil.AssertJSON(t, resp)
		errMsg, _ := data["error"].(string)
		assert.Contains(t, errMsg, "price_asc", "error payload must name the allowed values")
		assert.Contains(t, errMsg, "name")
	})

	t.Run("price_asc is honored server-side", func(t *testing.T) {
		testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Pricy"), testutil.WithPrice(30000))
		testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Cheap"), testutil.WithPrice(5000))

		resp := app.GET(t, "/public/"+slug+"/products?sort=price_asc", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		items, _ := data["data"].([]interface{})
		require.Len(t, items, 2)
		first, _ := items[0].(map[string]interface{})
		assert.Equal(t, "Cheap", first["name"], "cheapest product must come first")
	})

	t.Run("explicit valid sorts are accepted", func(t *testing.T) {
		for _, sort := range []string{"newest", "price_desc", "name"} {
			resp := app.GET(t, "/public/"+slug+"/products?sort="+sort, "")
			if resp.Body != nil {
				resp.Body.Close()
			}
			assert.NotEqual(t, http.StatusBadRequest, resp.StatusCode, "sort=%s must be accepted", sort)
		}
	})
}

// catalog-browsing REQ: Accent-Insensitive Search - ?search= matches name,
// description and sku accent-insensitively through the public endpoint.
func TestPublicSearchMatchesDescriptionAccented(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed,
		testutil.WithName("Halter Ajustable"),
		testutil.WithDescription("para caballos de tiro, cuero argentino"))

	t.Run("accented description search finds the product", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products?search=caballos", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		items, _ := data["data"].([]interface{})
		found := findByID(items, p.ID.String())
		assert.NotNil(t, found, "search over description must find the product")
	})

	t.Run("accent-insensitive name search finds the product", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products?search=ajustable", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		items, _ := data["data"].([]interface{})
		assert.NotNil(t, findByID(items, p.ID.String()))
	})
}

// Legacy ?category= exact-match fallback: a flat products.category string that
// is NOT a categories.slug must keep filtering exactly (transition compatibility).
func TestPublicListProductsLegacyCategoryFilter(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	mine := testutil.CreateTestProduct(t, app.DB, storeIDParsed,
		testutil.WithName("Bridle"), testutil.WithCategory("saddles-x"))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed,
		testutil.WithName("Boots"), testutil.WithCategory("footwear"))

	resp := app.GET(t, "/public/"+slug+"/products?category=saddles-x", "")
	testutil.AssertStatus(t, resp, http.StatusOK)
	data := testutil.AssertJSON(t, resp)
	testutil.AssertPaginated(t, data, 1)

	items, _ := data["data"].([]interface{})
	require.Len(t, items, 1)
	item, _ := items[0].(map[string]interface{})
	assert.Equal(t, mine.ID.String(), item["id"], "legacy exact category match must return only that product")
}

// readRawBody reads and closes a response body as raw bytes (for responses
// that are not a JSON object, e.g. the category tree's bare array).
func readRawBody(t *testing.T, resp *http.Response) []byte {
	t.Helper()
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	return raw
}

// catalog-browsing REQ: Hierarchical Categories with Real Counts.
func TestPublicListCategories(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	tack := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Tack"), testutil.WithCategorySlug("tack"))
	saddles := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Saddles"), testutil.WithCategorySlug("saddles"),
		testutil.WithParent(tack.ID))

	// 2 active products on Tack; 3 active + 1 inactive on Saddles.
	for i := 0; i < 2; i++ {
		testutil.CreateTestProduct(t, app.DB, storeIDParsed,
			testutil.WithCategory("tack"), testutil.WithCategoryID(tack.ID))
	}
	for i := 0; i < 3; i++ {
		testutil.CreateTestProduct(t, app.DB, storeIDParsed,
			testutil.WithCategory("saddles"), testutil.WithCategoryID(saddles.ID))
	}
	testutil.CreateTestProduct(t, app.DB, storeIDParsed,
		testutil.WithCategory("saddles"), testutil.WithCategoryID(saddles.ID),
		testutil.WithStatus("inactive"))

	t.Run("returns a tree with SQL-computed product_count (active only)", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/categories", "")
		testutil.AssertStatus(t, resp, http.StatusOK)

		var tree []map[string]interface{}
		require.NoError(t, json.Unmarshal(readRawBody(t, resp), &tree))
		require.Len(t, tree, 1, "Tack is the only root")

		tackNode := tree[0]
		assert.Equal(t, "Tack", tackNode["name"])
		assert.Equal(t, float64(2), tackNode["product_count"], "Tack count = its direct active products only")

		children, _ := tackNode["children"].([]interface{})
		require.Len(t, children, 1, "Tack nests Saddles")
		saddlesNode, _ := children[0].(map[string]interface{})
		assert.Equal(t, "Saddles", saddlesNode["name"])
		assert.Equal(t, float64(3), saddlesNode["product_count"], "inactive products must not count")

		leafChildren, ok := saddlesNode["children"].([]interface{})
		assert.True(t, ok, "leaf nodes must still carry a children key")
		assert.Len(t, leafChildren, 0)
	})

	t.Run("products filter by subcategory slug", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products?category=saddles", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 3)
	})
}
