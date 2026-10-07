package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestMarketplaceListStores(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, accountID, _ := app.OwnerAuthHeader(t) // creates "Test Store" (active)
	insert := func(name, slug, status string) {
		t.Helper()
		if _, err := app.DB.Exec(context.Background(), `
			INSERT INTO stores (account_id, name, slug, status) VALUES ($1, $2, $3, $4)`,
			accountID, name, slug, status); err != nil {
			t.Fatalf("insert store: %v", err)
		}
	}
	insert("Alpha Shop", "alpha-shop", "active")
	insert("Zeta Shop", "zeta-shop", "active")
	insert("Hidden Shop", "hidden-shop", "inactive")

	t.Run("lists only active stores ordered by name without private fields", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/stores", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 3)

		items, _ := data["data"].([]interface{})
		first, _ := items[0].(map[string]interface{})
		assert.Equal(t, "Alpha Shop", first["name"])
		assert.Len(t, first, 3)
		assert.NotContains(t, first, "account_id")
	})

	t.Run("search is case-insensitive", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/stores?search=zETA", "")
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 1)
	})

	t.Run("caps per_page and paginates", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/stores?per_page=1&page=2", "")
		data := testutil.AssertJSON(t, resp)
		assert.EqualValues(t, 1, data["per_page"])
		assert.EqualValues(t, 3, data["total_pages"])

		resp = app.GET(t, fmt.Sprintf("/marketplace/stores?per_page=%d", 500), "")
		data = testutil.AssertJSON(t, resp)
		assert.EqualValues(t, 50, data["per_page"])
	})
}

func TestMarketplaceListProducts(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, accountID, activeStoreID := app.OwnerAuthHeader(t) // "Test Store" (active)
	activeStore := uuid.MustParse(activeStoreID)

	inactiveStore := uuid.New()
	if _, err := app.DB.Exec(context.Background(), `
		INSERT INTO stores (id, account_id, name, slug, status) VALUES ($1, $2, 'Closed Shop', 'closed-shop', 'inactive')`,
		inactiveStore, accountID); err != nil {
		t.Fatalf("insert store: %v", err)
	}

	testutil.CreateTestProduct(t, app.DB, activeStore, testutil.WithName("Banana"), testutil.WithCategory("fruit"))
	testutil.CreateTestProduct(t, app.DB, activeStore, testutil.WithName("Apple 100%"), testutil.WithCategory("fruit"))
	testutil.CreateTestProduct(t, app.DB, activeStore, testutil.WithName("Hammer"), testutil.WithCategory("tools"))
	testutil.CreateTestProduct(t, app.DB, activeStore, testutil.WithName("Hidden Product"), testutil.WithStatus("inactive"))
	testutil.CreateTestProduct(t, app.DB, inactiveStore, testutil.WithName("Ghost Product"))

	t.Run("lists only active products of active stores ordered by name", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/products", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 3)

		items, _ := data["data"].([]interface{})
		first, _ := items[0].(map[string]interface{})
		assert.Equal(t, "Apple 100%", first["name"])
		assert.Equal(t, activeStoreID, first["store_id"])
		assert.NotContains(t, first, "cost")
		assert.NotContains(t, first, "min_stock")
		assert.Contains(t, first, "images")

		store, _ := first["store"].(map[string]interface{})
		assert.Equal(t, activeStoreID, store["id"])
		assert.Equal(t, "Test Store", store["name"])
		assert.NotEmpty(t, store["slug"])
		assert.Len(t, store, 3)
	})

	t.Run("search is case-insensitive and literal", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/products?search=hAMM", "")
		testutil.AssertPaginated(t, testutil.AssertJSON(t, resp), 1)

		resp = app.GET(t, "/marketplace/products?search=%25", "") // literal "%"
		testutil.AssertPaginated(t, testutil.AssertJSON(t, resp), 1)
	})

	t.Run("filters by exact category", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/products?category=fruit", "")
		testutil.AssertPaginated(t, testutil.AssertJSON(t, resp), 2)

		resp = app.GET(t, "/marketplace/products?category=frui", "")
		testutil.AssertPaginated(t, testutil.AssertJSON(t, resp), 0)
	})

	t.Run("caps per_page and paginates", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/products?per_page=1&page=2", "")
		data := testutil.AssertJSON(t, resp)
		assert.EqualValues(t, 1, data["per_page"])
		assert.EqualValues(t, 3, data["total_pages"])

		resp = app.GET(t, "/marketplace/products?per_page=500", "")
		data = testutil.AssertJSON(t, resp)
		assert.EqualValues(t, 50, data["per_page"])
	})
}
