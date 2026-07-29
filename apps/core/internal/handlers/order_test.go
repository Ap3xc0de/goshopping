package handlers_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func mustParseUUID(t *testing.T, s string) uuid.UUID {
	t.Helper()
	id, err := uuid.Parse(s)
	if err != nil {
		t.Fatalf("mustParseUUID: %v", err)
	}
	return id
}

func TestListOrders(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)

	t.Run("empty store returns empty list", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/orders", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 0)
	})

	t.Run("returns orders for store", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed)
		cust := testutil.CreateTestCustomer(t, app.DB, storeIDParsed)
		testutil.CreateTestOrder(t, app.DB, storeIDParsed, cust.ID, []models.Product{p}, "pending")

		resp := app.GET(t, "/stores/"+storeID+"/orders", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 1)
	})

	t.Run("filters by status", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/orders?status=paid", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, float64(0), data["total"])
	})
}

func TestCreateOrder(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))

	t.Run("creates order successfully", func(t *testing.T) {
		body := map[string]interface{}{
			"customer_name":  "John Doe",
			"customer_phone": "555-1234",
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "quantity": 2},
			},
			"payment_method": "cash",
		}
		resp := app.POST(t, "/stores/"+storeID+"/orders", body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "pending", data["status"])
	})

	t.Run("returns 422 when no items", func(t *testing.T) {
		body := map[string]interface{}{
			"customer_name": "Jane",
			"items":         []interface{}{},
		}
		resp := app.POST(t, "/stores/"+storeID+"/orders", body, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "items are required")
	})
}

func TestGetOrder(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed)
	cust := testutil.CreateTestCustomer(t, app.DB, storeIDParsed)
	o := testutil.CreateTestOrder(t, app.DB, storeIDParsed, cust.ID, []models.Product{p}, "pending")

	t.Run("returns order with timeline", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/orders/%s", storeID, o.ID), auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		order, _ := data["order"].(map[string]interface{})
		assert.Equal(t, o.ID.String(), order["id"])
		_, hasTimeline := data["timeline"]
		assert.True(t, hasTimeline)
	})

	t.Run("returns 404 for unknown order", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/orders/00000000-0000-0000-0000-000000000001", storeID), auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})
}

func TestChangeOrderStatus(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))
	cust := testutil.CreateTestCustomer(t, app.DB, storeIDParsed)
	o := testutil.CreateTestOrder(t, app.DB, storeIDParsed, cust.ID, []models.Product{p}, "pending")

	t.Run("valid transition pending->paid", func(t *testing.T) {
		resp := app.PATCH(t, fmt.Sprintf("/stores/%s/orders/%s/status", storeID, o.ID),
			map[string]interface{}{"status": "paid"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
	})

	t.Run("invalid transition returns 422", func(t *testing.T) {
		// o is now 'paid', can't go to 'pending'
		resp := app.PATCH(t, fmt.Sprintf("/stores/%s/orders/%s/status", storeID, o.ID),
			map[string]interface{}{"status": "pending"}, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)
	})
}

func TestCancelOrder(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))
	cust := testutil.CreateTestCustomer(t, app.DB, storeIDParsed)
	o := testutil.CreateTestOrder(t, app.DB, storeIDParsed, cust.ID, []models.Product{p}, "pending")

	t.Run("cancels pending order", func(t *testing.T) {
		resp := app.POST(t, fmt.Sprintf("/stores/%s/orders/%s/cancel", storeID, o.ID),
			map[string]interface{}{"reason": "Customer request"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		order, _ := data["order"].(map[string]interface{})
		assert.Equal(t, "cancelled", order["status"])
	})
}
