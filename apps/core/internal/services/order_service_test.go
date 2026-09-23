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

// product-variants REQ: Variant Order Lines, Old Orders Readable — orders
// referencing a variant deduct VARIANT stock (product stock untouched), the
// orders.items JSONB snapshot gains variant_id/sku/size/color, and orders
// without variant fields (old rows) remain fully readable.
func TestOrderService_CreateOrder_WithVariant(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	eventSvc := services.NewEventService(app.Config)
	custSvc := services.NewCustomerService(app.DB, app.Config)
	prodSvc := services.NewProductService(app.DB, app.Config, eventSvc)
	orderSvc := services.NewOrderService(app.DB, app.Config, eventSvc, custSvc, prodSvc)

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(100), testutil.WithStock(10))
	v := testutil.CreateTestVariant(t, app.DB, storeIDParsed, p.ID,
		testutil.WithVariantSKU("BREE-S-XL-V2"), testutil.WithVariantSize("XL"),
		testutil.WithVariantColor("Black"), testutil.WithVariantPrice(80), testutil.WithVariantStock(4))

	t.Run("variant order deducts variant stock, leaves product stock, snapshots variant fields", func(t *testing.T) {
		detail, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "Variant Buyer",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), VariantID: v.ID.String(), Quantity: 2},
			},
			PaymentMethod: "cash",
		}, nil)
		require.NoError(t, err)

		require.Equal(t, 2, testutil.GetVariantStock(t, app.DB, v.ID), "variant stock 4 → 2")
		got, err := prodSvc.GetProduct(storeIDParsed, p.ID)
		require.NoError(t, err)
		assert.Equal(t, 10, got.Stock, "variant orders must not deduct product stock")

		var items []models.OrderItem
		require.NoError(t, json.Unmarshal(detail.Order.Items, &items))
		require.Len(t, items, 1)
		item := items[0]
		assert.Equal(t, v.ID.String(), item.VariantID)
		assert.Equal(t, "BREE-S-XL-V2", item.SKU)
		assert.Equal(t, "XL", item.Size)
		assert.Equal(t, "Black", item.Color)
		assert.Equal(t, "80", item.Price.Decimal.String(), "line price must be the variant price")
		assert.Equal(t, "160", item.Total.Decimal.String())

		// Round-trip through a separate SELECT path to prove the snapshot is
		// really persisted, not echoed from memory.
		fetched, err := orderSvc.GetOrderByIDOnly(detail.Order.ID)
		require.NoError(t, err)
		var fetchedItems []models.OrderItem
		require.NoError(t, json.Unmarshal(fetched.Order.Items, &fetchedItems))
		require.Len(t, fetchedItems, 1)
		assert.Equal(t, v.ID.String(), fetchedItems[0].VariantID)
		assert.Equal(t, "XL", fetchedItems[0].Size)
	})

	t.Run("order without variant_id keeps product-level stock deduction", func(t *testing.T) {
		p2 := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(50), testutil.WithStock(7))

		_, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "Legacy Buyer",
			Items: []models.OrderItemInput{
				{ProductID: p2.ID.String(), Quantity: 2},
			},
			PaymentMethod: "cash",
		}, nil)
		require.NoError(t, err)

		got, err := prodSvc.GetProduct(storeIDParsed, p2.ID)
		require.NoError(t, err)
		assert.Equal(t, 5, got.Stock, "variant-less orders keep product-level deduction (backwards compatible)")
	})

	t.Run("insufficient variant stock rejects the order without side effects", func(t *testing.T) {
		before := testutil.GetVariantStock(t, app.DB, v.ID)

		_, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "Greedy Buyer",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), VariantID: v.ID.String(), Quantity: 3},
			},
			PaymentMethod: "cash",
		}, nil)
		require.Error(t, err)
		assert.Equal(t, before, testutil.GetVariantStock(t, app.DB, v.ID), "failed orders must not touch variant stock")
	})

	t.Run("cancelling a variant order restores variant stock (not product stock)", func(t *testing.T) {
		before := testutil.GetVariantStock(t, app.DB, v.ID)

		detail, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "Cancelling Buyer",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), VariantID: v.ID.String(), Quantity: 1},
			},
			PaymentMethod: "cash",
		}, nil)
		require.NoError(t, err)
		require.Equal(t, before-1, testutil.GetVariantStock(t, app.DB, v.ID))

		_, err = orderSvc.ChangeOrderStatus(storeIDParsed, detail.Order.ID,
			models.UpdateOrderStatusInput{Status: "cancelled"}, nil)
		require.NoError(t, err)
		assert.Equal(t, before, testutil.GetVariantStock(t, app.DB, v.ID), "cancel must restore the variant's stock")

		got, err := prodSvc.GetProduct(storeIDParsed, p.ID)
		require.NoError(t, err)
		assert.Equal(t, 10, got.Stock, "cancel must not touch product stock on variant orders")
	})
}

// product-variants REQ: Old orders (items JSONB without variant fields) stay
// status-readable unchanged.
func TestOrderService_VariantOldOrdersRemainReadable(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	eventSvc := services.NewEventService(app.Config)
	custSvc := services.NewCustomerService(app.DB, app.Config)
	prodSvc := services.NewProductService(app.DB, app.Config, eventSvc)
	orderSvc := services.NewOrderService(app.DB, app.Config, eventSvc, custSvc, prodSvc)

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithPrice(100), testutil.WithStock(10))

	// CreateTestOrder writes OrderItem WITHOUT variant keys — byte-for-byte
	// the shape orders stored before this change had.
	old := testutil.CreateTestOrder(t, app.DB, storeIDParsed, uuid.Nil, []models.Product{p}, "pending")

	detail, err := orderSvc.GetOrderByIDOnly(old.ID)
	require.NoError(t, err)
	assert.Equal(t, "pending", detail.Order.Status)

	var items []models.OrderItem
	require.NoError(t, json.Unmarshal(detail.Order.Items, &items))
	require.Len(t, items, 1)
	assert.Equal(t, p.Name, items[0].Name, "plain item fields must survive")
	assert.Empty(t, items[0].VariantID, "legacy rows simply have no variant fields")
	assert.Empty(t, items[0].SKU)
}

// shipping-zones REQ: Quote Carrier Cost — CreateOrder persists shipping_method
// and a server-computed shipping_total (never trusting a client-provided
// number); store-currency REQ: orders are stamped with currency='USD'.
func TestOrderService_CreateOrder_PersistsShippingAndCurrency(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	eventSvc := services.NewEventService(app.Config)
	custSvc := services.NewCustomerService(app.DB, app.Config)
	prodSvc := services.NewProductService(app.DB, app.Config, eventSvc)
	orderSvc := services.NewOrderService(app.DB, app.Config, eventSvc, custSvc, prodSvc)

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)

	zone := testutil.CreateTestShippingZone(t, app.DB, storeIDParsed)
	method := testutil.CreateTestShippingMethod(t, app.DB, storeIDParsed, zone.ID,
		testutil.WithMethodCode("std"), testutil.WithMethodBasePrice(5), testutil.WithMethodWeightRate(0.1))

	t.Run("persists shipping_method, computed shipping_total, and currency=USD", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed,
			testutil.WithPrice(100), testutil.WithStock(10), testutil.WithWeight(2))
		shippingMethod := method.Code

		detail, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "Shipping Buyer",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), Quantity: 3},
			},
			PaymentMethod:  "cash",
			ShippingMethod: &shippingMethod,
		}, nil)
		require.NoError(t, err)

		// weight_total = 2kg * 3 = 6; shipping_total = 5 + 6*0.1 = 5.6
		assert.Equal(t, "std", detail.Order.ShippingMethod)
		assert.Equal(t, "5.6", detail.Order.ShippingTotal.Decimal.StringFixed(1))
		assert.Equal(t, "USD", detail.Order.Currency)

		// Round-trip through GetOrder to prove it is really persisted.
		fetched, err := orderSvc.GetOrder(storeIDParsed, detail.Order.ID)
		require.NoError(t, err)
		assert.Equal(t, "std", fetched.Order.ShippingMethod)
		assert.Equal(t, "5.6", fetched.Order.ShippingTotal.Decimal.StringFixed(1))
		assert.Equal(t, "USD", fetched.Order.Currency)
	})

	t.Run("unknown shipping_method rejects the order", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))
		bad := "does-not-exist"

		_, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "Bad Shipping Buyer",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), Quantity: 1},
			},
			PaymentMethod:  "cash",
			ShippingMethod: &bad,
		}, nil)
		require.Error(t, err)
	})

	t.Run("omitted shipping_method keeps shipping_total at 0 and currency USD", func(t *testing.T) {
		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithStock(10))

		detail, err := orderSvc.CreateOrder(storeIDParsed, models.CreateOrderInput{
			CustomerName: "No Shipping Buyer",
			Items: []models.OrderItemInput{
				{ProductID: p.ID.String(), Quantity: 1},
			},
			PaymentMethod: "cash",
		}, nil)
		require.NoError(t, err)
		assert.Empty(t, detail.Order.ShippingMethod)
		assert.True(t, detail.Order.ShippingTotal.IsZero(), "shipping_total should default to 0")
		assert.Equal(t, "USD", detail.Order.Currency)
	})
}
