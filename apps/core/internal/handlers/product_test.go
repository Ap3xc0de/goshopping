package handlers_test

import (
	"encoding/json"
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

// TestProductCategoryAssignment pins the fix for bug/product-category-id-not-persisted:
// the product create/update API never read/wrote products.category_id — only
// the legacy free-text `category` column — so every admin-created product
// left category_id NULL and never showed up in the public category tree's
// counts or the `?category=` filter. Only LEAF categories (no children), at
// any depth, are assignable; category is optional; when category_id is set
// the legacy `category` text is synced to that category's slug, and clearing
// category_id resets the legacy text to "" too.
func TestProductCategoryAssignment(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)

	tack := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Tack"), testutil.WithCategorySlug("tack"))
	saddles := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Saddles"), testutil.WithCategorySlug("saddles"),
		testutil.WithParent(tack.ID))

	t.Run("create with a leaf category round-trips category_id and syncs the legacy slug", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/products", map[string]interface{}{
			"name": "Leaf Saddle", "price": 100000, "stock": 1,
			"category_id": saddles.ID.String(),
		}, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, saddles.ID.String(), data["category_id"])
		assert.Equal(t, "saddles", data["category"], "legacy category text must sync to the leaf's slug")
	})

	t.Run("create with a parent category (has children) is rejected", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/products", map[string]interface{}{
			"name": "Bad Parent Assign", "price": 1000, "stock": 1,
			"category_id": tack.ID.String(),
		}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "leaf")
	})

	t.Run("create with another store's category is rejected", func(t *testing.T) {
		_, _, otherStoreID := app.CreateOtherOwner(t)
		otherStoreIDParsed := mustParseUUID(t, otherStoreID)
		foreign := testutil.CreateTestCategory(t, app.DB, otherStoreIDParsed,
			testutil.WithCategoryName("Foreign"), testutil.WithCategorySlug("foreign"))

		resp := app.POST(t, "/stores/"+storeID+"/products", map[string]interface{}{
			"name": "Cross Store", "price": 1000, "stock": 1,
			"category_id": foreign.ID.String(),
		}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "category")
	})

	t.Run("create without a category leaves category_id null", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/products",
			map[string]interface{}{"name": "No Category", "price": 1000, "stock": 1}, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Nil(t, data["category_id"])
	})

	t.Run("update assigns then clears the category", func(t *testing.T) {
		created := testutil.AssertJSON(t, app.POST(t, "/stores/"+storeID+"/products",
			map[string]interface{}{"name": "Reassign Me", "price": 1000, "stock": 1}, auth))
		productID := created["id"].(string)
		assert.Nil(t, created["category_id"])

		resp := app.PUT(t, "/stores/"+storeID+"/products/"+productID,
			map[string]interface{}{"category_id": saddles.ID.String()}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, saddles.ID.String(), data["category_id"])
		assert.Equal(t, "saddles", data["category"])

		clearResp := app.PUT(t, "/stores/"+storeID+"/products/"+productID,
			map[string]interface{}{"category_id": ""}, auth)
		testutil.AssertStatus(t, clearResp, http.StatusOK)
		cleared := testutil.AssertJSON(t, clearResp)
		assert.Nil(t, cleared["category_id"], "explicit \"\" must clear category_id")
		assert.Equal(t, "", cleared["category"], "clearing category_id must also reset the legacy text")

		reread := testutil.AssertJSON(t, app.GET(t, "/stores/"+storeID+"/products/"+productID, auth))
		assert.Nil(t, reread["category_id"], "clear must persist")
	})

	t.Run("update omitting category_id leaves the existing assignment unchanged", func(t *testing.T) {
		created := testutil.AssertJSON(t, app.POST(t, "/stores/"+storeID+"/products", map[string]interface{}{
			"name": "Untouched", "price": 1000, "stock": 1, "category_id": saddles.ID.String(),
		}, auth))
		productID := created["id"].(string)

		resp := app.PUT(t, "/stores/"+storeID+"/products/"+productID,
			map[string]interface{}{"name": "Untouched Renamed"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, saddles.ID.String(), data["category_id"], "category_id must survive an update that doesn't mention it")
		assert.Equal(t, "saddles", data["category"])
	})

	t.Run("end-to-end: a product created through the API shows up in public category counts and filters", func(t *testing.T) {
		boots := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
			testutil.WithCategoryName("Boots"), testutil.WithCategorySlug("boots-e2e"),
			testutil.WithParent(tack.ID))

		createResp := app.POST(t, "/stores/"+storeID+"/products", map[string]interface{}{
			"name": "E2E Boots", "price": 50000, "stock": 2,
			"category_id": boots.ID.String(),
		}, auth)
		testutil.AssertStatus(t, createResp, http.StatusCreated)

		treeResp := app.GET(t, "/public/"+slug+"/categories", "")
		testutil.AssertStatus(t, treeResp, http.StatusOK)
		var tree []map[string]interface{}
		require.NoError(t, json.Unmarshal(readRawBody(t, treeResp), &tree))

		require.Len(t, tree, 1, "Tack is the only root")
		tackNode := tree[0]
		children, _ := tackNode["children"].([]interface{})
		var bootsNode map[string]interface{}
		for _, raw := range children {
			child, _ := raw.(map[string]interface{})
			if child["slug"] == "boots-e2e" {
				bootsNode = child
			}
		}
		require.NotNil(t, bootsNode, "Boots must appear as a child of Tack")
		// Boots is a category created fresh in this subtest, so its direct
		// count is isolated from whatever earlier subtests assigned to its
		// Saddles sibling. Tack's rollup total is NOT isolated (earlier
		// subtests also assigned products under Tack's tree), so that one is
		// cross-checked against the products endpoint's total instead of a
		// hardcoded number — same pattern as TestPublicListCategories'
		// "total_product_count matches the paginated products total" case.
		assert.Equal(t, float64(1), bootsNode["product_count"], "the API-created product must count toward Boots")
		tackTotal := tackNode["total_product_count"]

		filterResp := app.GET(t, "/public/"+slug+"/products?category=boots-e2e", "")
		testutil.AssertStatus(t, filterResp, http.StatusOK)
		filterData := testutil.AssertJSON(t, filterResp)
		testutil.AssertPaginated(t, filterData, 1)

		parentFilterResp := app.GET(t, "/public/"+slug+"/products?category=tack", "")
		testutil.AssertStatus(t, parentFilterResp, http.StatusOK)
		parentFilterData := testutil.AssertJSON(t, parentFilterResp)
		assert.Equal(t, tackTotal, parentFilterData["total"],
			"the parent-slug filter's total must match the tree's rolled-up total_product_count")
	})
}
