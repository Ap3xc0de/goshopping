package handlers_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestListCustomers(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)

	t.Run("empty store returns empty list", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/customers", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 0)
	})

	t.Run("returns customers for store", func(t *testing.T) {
		testutil.CreateTestCustomer(t, app.DB, storeIDParsed, testutil.WithCustomerName("Alice"))
		testutil.CreateTestCustomer(t, app.DB, storeIDParsed, testutil.WithCustomerName("Bob"))

		resp := app.GET(t, "/stores/"+storeID+"/customers", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 2)
	})

	t.Run("search filters by name", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/customers?search=Alice", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(1), data["total"])
	})
}

func TestCreateCustomer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("creates customer successfully", func(t *testing.T) {
		body := map[string]interface{}{
			"name":  "New Customer",
			"email": "new@test.com",
			"phone": "555-9999",
		}
		resp := app.POST(t, "/stores/"+storeID+"/customers", body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "New Customer", data["name"])
	})

	t.Run("upserts existing customer by email", func(t *testing.T) {
		body := map[string]interface{}{
			"name":  "Updated Name",
			"email": "new@test.com",
			"phone": "555-8888",
		}
		resp := app.POST(t, "/stores/"+storeID+"/customers", body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "Updated Name", data["name"])
	})

	t.Run("returns 422 when name missing", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/customers",
			map[string]interface{}{"email": "x@test.com"}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "name is required")
	})
}

func TestGetCustomer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	cust := testutil.CreateTestCustomer(t, app.DB, storeIDParsed)

	t.Run("returns customer", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/customers/%s", storeID, cust.ID), auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, cust.ID.String(), data["id"])
	})

	t.Run("returns 404 for unknown customer", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/customers/00000000-0000-0000-0000-000000000001", storeID), auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})
}

func TestUpdateCustomer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	cust := testutil.CreateTestCustomer(t, app.DB, storeIDParsed, testutil.WithCustomerName("Before"))

	t.Run("partial update succeeds", func(t *testing.T) {
		name := "After"
		resp := app.PUT(t, fmt.Sprintf("/stores/%s/customers/%s", storeID, cust.ID),
			map[string]interface{}{"name": name}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, name, data["name"])
	})
}

func TestCustomerOrders(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	cust := testutil.CreateTestCustomer(t, app.DB, storeIDParsed)

	t.Run("returns empty orders for new customer", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/customers/%s/orders", storeID, cust.ID), auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(0), data["total"])
	})
}
