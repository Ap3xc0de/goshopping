package handlers_test

import (
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestGetDashboard(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)

	t.Run("returns zero metrics for empty store", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/dashboard", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(0), data["total_orders"])
		assert.Equal(t, float64(0), data["total_customers"])
		assert.Equal(t, float64(0), data["total_products"])
	})

	t.Run("reflects created products", func(t *testing.T) {
		testutil.CreateTestProduct(t, app.DB, storeIDParsed)
		testutil.CreateTestProduct(t, app.DB, storeIDParsed)

		resp := app.GET(t, "/stores/"+storeID+"/dashboard", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(2), data["total_products"])
	})

	t.Run("requires auth", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/dashboard", "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})
}

func TestGetSalesReport(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("returns empty sales report", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/reports/sales", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
	})
}

func TestGetTopProducts(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)

	t.Run("returns empty top products", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/reports/products", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		_, hasData := data["data"]
		assert.True(t, hasData)
	})

	t.Run("reflects completed orders", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Top Product"))
		cust := testutil.CreateTestCustomer(t, app.DB, storeIDParsed)
		testutil.CreateTestOrder(t, app.DB, storeIDParsed, cust.ID, []models.Product{p}, "delivered")

		resp := app.GET(t, "/stores/"+storeID+"/reports/products?limit=5", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
	})
}

func TestGetTopCustomers(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("returns empty top customers", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/reports/customers", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		_, hasData := data["data"]
		assert.True(t, hasData)
	})
}
