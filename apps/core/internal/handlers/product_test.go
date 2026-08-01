package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSuspendedStoreBlocksNonSuperadmin(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	testutil.CreateTestProduct(t, app.DB, mustParseUUID(t, storeID))

	_, err := app.DB.Exec(context.Background(),
		`UPDATE stores SET status = 'suspended' WHERE id = $1`, storeID)
	require.NoError(t, err)

	resp := app.GET(t, "/stores/"+storeID+"/products", auth)
	testutil.AssertStatus(t, resp, http.StatusForbidden)

	adminAuth, _ := app.SuperAdminAuthHeader(t)
	adminResp := app.GET(t, "/stores/"+storeID+"/products", adminAuth)
	testutil.AssertStatus(t, adminResp, http.StatusOK)
}

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
