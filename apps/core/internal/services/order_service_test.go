package services_test

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestOrderService_CreateOrder_ShippingAddressAndPaymentStatus covers CORE-01,
// CORE-02, CORE-03, CORE-04: shipping_address persists through CreateOrder and
// is readable back via GetOrder, and payment_status defaults to "pending"
// independently of status.
func TestOrderService_CreateOrder_ShippingAddressAndPaymentStatus(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	eventSvc := services.NewEventService(app.Config)
	custSvc := services.NewCustomerService(app.DB, app.Config)
	prodSvc := services.NewProductService(app.DB, app.Config, eventSvc)
	orderSvc := services.NewOrderService(app.DB, app.Config, eventSvc, custSvc, prodSvc)

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	t.Run("persists shipping_address and defaults payment_status to pending", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))

		detail, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName:  "Jane Doe",
			CustomerEmail: "jane@test.com",
			CustomerPhone: "555-1234",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), Quantity: 2},
			},
			PaymentMethod: "cash",
			ShippingAddress: &models.ShippingAddress{
				Street: "Calle 123",
				City:   "Bogotá",
				State:  "Cundinamarca",
				Zip:    "110111",
			},
		}, nil)
		require.NoError(t, err)

		assert.Equal(t, "pending", detail.Order.PaymentStatus)
		require.NotEmpty(t, detail.Order.ShippingAddress, "shipping_address should be persisted")

		var addr models.ShippingAddress
		require.NoError(t, json.Unmarshal(detail.Order.ShippingAddress, &addr))
		assert.Equal(t, "Calle 123", addr.Street)
		assert.Equal(t, "Bogotá", addr.City)
		assert.Equal(t, "Cundinamarca", addr.State)
		assert.Equal(t, "110111", addr.Zip)

		// Round-trip through GetOrder (separate SELECT path from CreateOrder's
		// own return) to prove the column is actually readable, not just
		// echoed back from memory.
		fetched, err := orderSvc.GetOrder(storeIDParsed, detail.Order.ID)
		require.NoError(t, err)
		assert.Equal(t, "pending", fetched.Order.PaymentStatus)
		require.NotEmpty(t, fetched.Order.ShippingAddress)
		var fetchedAddr models.ShippingAddress
		require.NoError(t, json.Unmarshal(fetched.Order.ShippingAddress, &fetchedAddr))
		assert.Equal(t, "Calle 123", fetchedAddr.Street)
	})

	t.Run("shipping_address is optional — order without it has a nil/empty shipping_address", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))

		detail, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "No Address Customer",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), Quantity: 1},
			},
			PaymentMethod: "cash",
		}, nil)
		require.NoError(t, err)

		assert.Equal(t, "pending", detail.Order.PaymentStatus)
		assert.Empty(t, string(detail.Order.ShippingAddress), "shipping_address should be empty when not provided")
	})

	t.Run("rejects an incomplete shipping_address", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))

		_, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "Bad Address Customer",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), Quantity: 1},
			},
			PaymentMethod: "cash",
			ShippingAddress: &models.ShippingAddress{
				Street: "Calle 123",
				// City/State/Zip missing on purpose.
			},
		}, nil)
		require.Error(t, err)
	})
}

// TestOrderService_ListOrders_IncludesPaymentStatus covers CORE-04 for the
// list path (a third SELECT distinct from Get/GetByIDOnly).
func TestOrderService_ListOrders_IncludesPaymentStatus(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	eventSvc := services.NewEventService(app.Config)
	custSvc := services.NewCustomerService(app.DB, app.Config)
	prodSvc := services.NewProductService(app.DB, app.Config, eventSvc)
	orderSvc := services.NewOrderService(app.DB, app.Config, eventSvc, custSvc, prodSvc)

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))

	_, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
		CustomerName: "List Customer",
		Items: []models.OrderItemInput{
			{ProductID: p.ID.String(), Quantity: 1},
		},
		PaymentMethod: "cash",
	}, nil)
	require.NoError(t, err)

	result, err := orderSvc.ListOrders(storeIDParsed, 1, 20, "", "", "", "")
	require.NoError(t, err)
	require.Len(t, result.Orders, 1)
	assert.Equal(t, "pending", result.Orders[0].PaymentStatus)
}
