package handlers_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListProducts(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)

	t.Run("empty store returns empty list", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/products", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 0)
	})

	t.Run("returns products for store", func(t *testing.T) {
		testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Product A"))
		testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Product B"))

		resp := app.GET(t, "/stores/"+storeID+"/products", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 2)
	})

	t.Run("filters by search", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/products?search=Product+A", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(1), data["total"])
	})

	t.Run("requires auth", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/products", "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("other owner cannot access store", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.GET(t, "/stores/"+storeID+"/products", otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})
}

func TestCreateProduct(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("creates product successfully", func(t *testing.T) {
		body := map[string]interface{}{
			"name":  "New Product",
			"price": 15000,
			"stock": 50,
		}
		resp := app.POST(t, "/stores/"+storeID+"/products", body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "New Product", data["name"])
		assert.Equal(t, float64(15000), data["price"])
	})

	t.Run("auto sets out_of_stock when stock is 0", func(t *testing.T) {
		body := map[string]interface{}{
			"name":  "Zero Stock",
			"price": 1000,
			"stock": 0,
		}
		resp := app.POST(t, "/stores/"+storeID+"/products", body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "out_of_stock", data["status"])
	})

	t.Run("returns 422 when name missing", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/products", map[string]interface{}{"price": 100}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "name is required")
	})
}

func TestGetProduct(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed)

	t.Run("returns product", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/products/%s", storeID, p.ID), auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, p.ID.String(), data["id"])
	})

	t.Run("returns 404 for unknown product", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/products/00000000-0000-0000-0000-000000000001", storeID), auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})
}

func TestUpdateProduct(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Original"))

	t.Run("partial update succeeds", func(t *testing.T) {
		newName := "Updated"
		resp := app.PUT(t, fmt.Sprintf("/stores/%s/products/%s", storeID, p.ID),
			map[string]interface{}{"name": newName}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, newName, data["name"])
	})

	t.Run("sets out_of_stock when stock updated to 0", func(t *testing.T) {
		resp := app.PUT(t, fmt.Sprintf("/stores/%s/products/%s", storeID, p.ID),
			map[string]interface{}{"stock": 0}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "out_of_stock", data["status"])
	})
}

func TestDeleteProduct(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed)

	t.Run("soft deletes product", func(t *testing.T) {
		resp := app.DELETE(t, fmt.Sprintf("/stores/%s/products/%s", storeID, p.ID), auth)
		testutil.AssertStatus(t, resp, http.StatusNoContent)

		// Should not appear in list anymore
		listResp := app.GET(t, "/stores/"+storeID+"/products", auth)
		data := testutil.AssertJSON(t, listResp)
		assert.Equal(t, float64(0), data["total"])
	})
}

func TestBulkImportProducts(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	csvContent := "name,sku,price,cost,stock,category\nCSV Product,CSV-001,5000,2000,10,electronics\n"

	t.Run("imports CSV products", func(t *testing.T) {
		resp := app.POSTFile(t,
			"/stores/"+storeID+"/products/bulk-import",
			"file", "products.csv", csvContent, auth)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		data := testutil.AssertJSON(t, resp)
		imported, _ := data["imported"].(float64)
		assert.GreaterOrEqual(t, imported, float64(1))
	})
}

// product-variants REQ: Admin Variant CRUD — GET list, POST create, PATCH
// update, DELETE under /stores/:storeId/products/:productId/variants, JWT +
// StoreContext gated, store-scoped by the context store.
func TestVariantAdminCRUD(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Breeches"))

	variantPath := "/stores/" + storeID + "/products/" + p.ID.String() + "/variants"

	t.Run("creates a variant and lists it", func(t *testing.T) {
		body := map[string]interface{}{
			"sku": "BREE-S-L", "size": "L", "color": "Brown",
			"price_override": 120, "stock": 5,
		}
		resp := app.POST(t, variantPath, body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "BREE-S-L", data["sku"])
		assert.Equal(t, float64(120), data["price_override"])
		assert.Equal(t, float64(5), data["stock"])
		assert.Equal(t, "active", data["status"])

		listResp := app.GET(t, variantPath, auth)
		testutil.AssertStatus(t, listResp, http.StatusOK)
		list := testutil.AssertJSON(t, listResp)
		variants, _ := list["variants"].([]interface{})
		require.Len(t, variants, 1)
	})

	t.Run("seller edits variant stock via PATCH", func(t *testing.T) {
		createResp := app.POST(t, variantPath, map[string]interface{}{
			"sku": "BREE-S-M", "size": "M", "stock": 3,
		}, auth)
		testutil.AssertStatus(t, createResp, http.StatusCreated)
		created := testutil.AssertJSON(t, createResp)
		variantID, _ := created["id"].(string)
		require.NotEmpty(t, variantID)

		resp := app.PATCH(t, variantPath+"/"+variantID, map[string]interface{}{"stock": 7}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(7), data["stock"], "PATCH stock must persist (spec: seller edits variant stock)")
		assert.Equal(t, "BREE-S-M", data["sku"], "untouched fields must survive a partial update")
	})

	t.Run("creates variant without price_override (falls back to product price in public API)", func(t *testing.T) {
		resp := app.POST(t, variantPath, map[string]interface{}{
			"sku": "BREE-S-XL", "size": "XL", "stock": 2,
		}, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Nil(t, data["price_override"], "price_override must stay null when omitted")
	})

	t.Run("duplicate SKU on the same product returns 422", func(t *testing.T) {
		resp := app.POST(t, variantPath, map[string]interface{}{
			"sku": "BREE-S-L", "stock": 1,
		}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "SKU")
	})

	t.Run("creating on an unknown product returns 404", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/products/00000000-0000-0000-0000-000000000001/variants",
			map[string]interface{}{"sku": "BREE-ORPHAN"}, auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("missing sku returns 422", func(t *testing.T) {
		resp := app.POST(t, variantPath, map[string]interface{}{"size": "S"}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "sku")
	})

	t.Run("delete removes the variant and public responses drop it", func(t *testing.T) {
		createResp := app.POST(t, variantPath, map[string]interface{}{
			"sku": "BREE-S-XXL", "size": "XXL", "stock": 1, "price_override": 250,
		}, auth)
		testutil.AssertStatus(t, createResp, http.StatusCreated)
		created := testutil.AssertJSON(t, createResp)
		variantID, _ := created["id"].(string)

		delResp := app.DELETE(t, variantPath+"/"+variantID, auth)
		testutil.AssertStatus(t, delResp, http.StatusNoContent)

		listResp := app.GET(t, variantPath, auth)
		list := testutil.AssertJSON(t, listResp)
		variants, _ := list["variants"].([]interface{})
		for _, raw := range variants {
			v, _ := raw.(map[string]interface{})
			assert.NotEqual(t, variantID, v["id"], "deleted variant must be gone from the admin list")
		}

		pubResp := app.GET(t, "/public/"+slug+"/products/"+p.ID.String(), "")
		testutil.AssertStatus(t, pubResp, http.StatusOK)
		pub := testutil.AssertJSON(t, pubResp)
		pubVariants, _ := pub["variants"].([]interface{})
		for _, raw := range pubVariants {
			v, _ := raw.(map[string]interface{})
			assert.NotEqual(t, variantID, v["id"], "deleted variant must vanish from public responses too")
		}
	})

	t.Run("patch/delete on unknown variant returns 404", func(t *testing.T) {
		patchResp := app.PATCH(t, variantPath+"/00000000-0000-0000-0000-000000000001",
			map[string]interface{}{"stock": 1}, auth)
		testutil.AssertStatus(t, patchResp, http.StatusNotFound)

		delResp := app.DELETE(t, variantPath+"/00000000-0000-0000-0000-000000000001", auth)
		testutil.AssertStatus(t, delResp, http.StatusNotFound)
	})

	t.Run("requires auth and denies other owners", func(t *testing.T) {
		noAuth := app.GET(t, variantPath, "")
		testutil.AssertStatus(t, noAuth, http.StatusUnauthorized)

		otherAuth, _, _ := app.CreateOtherOwner(t)
		otherList := app.GET(t, variantPath, otherAuth)
		testutil.AssertStatus(t, otherList, http.StatusForbidden)
	})
}

// TestProductWeightRoundTrip pins the write path for products.weight. The
// column and the GET response existed, but neither the create nor the update
// DTO carried it, so a seller could type a weight and have it silently
// discarded — which in turn made weight-based shipping always price at the
// method's base rate.
func TestProductWeightRoundTrip(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("persists weight on create", func(t *testing.T) {
		body := map[string]interface{}{
			"name":   "Saddle",
			"price":  250000,
			"stock":  3,
			"weight": 7.5,
		}
		resp := app.POST(t, "/stores/"+storeID+"/products", body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, 7.5, data["weight"])
	})

	t.Run("persists weight on update", func(t *testing.T) {
		created := testutil.AssertJSON(t, app.POST(t, "/stores/"+storeID+"/products",
			map[string]interface{}{"name": "Bridle", "price": 80000, "stock": 5}, auth))
		productID := created["id"].(string)
		assert.Equal(t, float64(0), created["weight"])

		resp := app.PUT(t, "/stores/"+storeID+"/products/"+productID,
			map[string]interface{}{"weight": 1.25}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		assert.Equal(t, 1.25, testutil.AssertJSON(t, resp)["weight"])

		reread := testutil.AssertJSON(t, app.GET(t, "/stores/"+storeID+"/products/"+productID, auth))
		assert.Equal(t, 1.25, reread["weight"])
	})

	t.Run("rejects negative weight", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/products",
			map[string]interface{}{"name": "Bad", "price": 100, "stock": 1, "weight": -1}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "weight cannot be negative")
	})
}
