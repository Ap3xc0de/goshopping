package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

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
