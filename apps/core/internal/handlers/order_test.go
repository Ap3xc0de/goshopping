package handlers_test

import (
	"context"
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
		// OrderDetail embebe models.Order inline: los campos van en la raíz, no bajo "order"
		assert.Equal(t, o.ID.String(), data["id"])
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

// TestOrderLifecycleStock walks create → pay and create → cancel over HTTP.
//
// The other status tests build their order with testutil.CreateTestOrder, which
// inserts the row directly and never runs OrderService.CreateOrder, so none of
// them observe the stock bookkeeping that CreateOrder performs. That blind spot
// is exactly why a double deduction went unnoticed.
func TestOrderLifecycleStock(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)

	stockOf := func(t *testing.T, productID uuid.UUID) int {
		t.Helper()
		var stock int
		if err := app.DB.QueryRow(context.Background(),
			`SELECT stock FROM products WHERE id = $1`, productID).Scan(&stock); err != nil {
			t.Fatalf("read stock: %v", err)
		}
		return stock
	}

	createOrder := func(t *testing.T, productID uuid.UUID, qty int) string {
		t.Helper()
		body := map[string]interface{}{
			"customer_name":  "Stock Tester",
			"customer_phone": "555-0000",
			"items": []map[string]interface{}{
				{"product_id": productID.String(), "quantity": qty},
			},
			"payment_method": "cash",
		}
		resp := app.POST(t, "/stores/"+storeID+"/orders", body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		id, ok := data["id"].(string)
		if !ok {
			t.Fatalf("order id missing from create response: %v", data)
		}
		return id
	}

	t.Run("paying an order does not deduct the same units twice", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))
		orderID := createOrder(t, p.ID, 10)
		assert.Equal(t, 0, stockOf(t, p.ID), "creating the order should reserve the full stock")

		resp := app.PATCH(t, fmt.Sprintf("/stores/%s/orders/%s/status", storeID, orderID),
			map[string]interface{}{"status": "paid"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		assert.Equal(t, 0, stockOf(t, p.ID), "paying must not deduct the reserved units again")
	})

	t.Run("cancelling a pending order restores the reserved stock", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))
		orderID := createOrder(t, p.ID, 4)
		assert.Equal(t, 6, stockOf(t, p.ID), "creating the order should reserve 4 units")

		resp := app.POST(t, fmt.Sprintf("/stores/%s/orders/%s/cancel", storeID, orderID),
			map[string]interface{}{"reason": "Customer request"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		assert.Equal(t, 10, stockOf(t, p.ID), "cancelling a pending order must return the reserved units")
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
		assert.Equal(t, "cancelled", data["status"])
	})
}
