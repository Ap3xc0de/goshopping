package handlers_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
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
	if _, err := app.DB.Exec(context.Background(), `
		UPDATE stores SET logo_url = 'https://cdn.example.com/alpha.png', description = 'Fresh goods', category = 'grocery'
		WHERE slug = 'alpha-shop'`); err != nil {
		t.Fatalf("update store profile: %v", err)
	}

	t.Run("lists only active stores ordered by name without private fields", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/stores", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 3)

		items, _ := data["data"].([]interface{})
		first, _ := items[0].(map[string]interface{})
		assert.Equal(t, "Alpha Shop", first["name"])
		assert.Len(t, first, 6)
		assert.NotContains(t, first, "account_id")
		assert.Equal(t, "https://cdn.example.com/alpha.png", first["logo_url"])
		assert.Equal(t, "Fresh goods", first["description"])
		assert.Equal(t, "grocery", first["category"])

		// Stores without a profile expose empty strings, never null.
		last, _ := items[len(items)-1].(map[string]interface{})
		assert.Equal(t, "Zeta Shop", last["name"])
		assert.Equal(t, "", last["logo_url"])
		assert.Equal(t, "", last["description"])
		assert.Equal(t, "", last["category"])
	})

	t.Run("filters by exact category", func(t *testing.T) {
		resp := app.GET(t, "/marketplace/stores?category=grocery", "")
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 1)

		resp = app.GET(t, "/marketplace/stores?category=groc", "")
		testutil.AssertPaginated(t, testutil.AssertJSON(t, resp), 0)
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

func TestMarketplaceHidesInternalErrors(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	// A closed pool makes every query fail deterministically.
	app.DB.Close()

	for _, path := range []string{"/marketplace/stores", "/marketplace/products"} {
		t.Run(path, func(t *testing.T) {
			resp := app.GET(t, path, "")
			testutil.AssertStatus(t, resp, http.StatusInternalServerError)
			body, _ := io.ReadAll(resp.Body)
			assert.JSONEq(t, `{"error":"internal server error"}`, string(body))
			assert.NotContains(t, string(body), "pool")
			assert.NotContains(t, string(body), "count ")
		})
	}
}

// marketplaceItems returns the "data" array of a paginated response, failing
// the test if it is missing or null.
func marketplaceItems(t *testing.T, data map[string]interface{}) []map[string]interface{} {
	t.Helper()
	raw, ok := data["data"].([]interface{})
	if !ok {
		t.Fatalf("data is not an array: %#v", data["data"])
	}
	items := make([]map[string]interface{}, 0, len(raw))
	for _, r := range raw {
		items = append(items, r.(map[string]interface{}))
	}
	return items
}

// collectPages walks every page of path (per_page=2) and returns the "id" and
// "name" of each item in the order served.
func collectPages(t *testing.T, app *testutil.TestApp, path string, wantPages int) (ids, names []string) {
	t.Helper()
	for page := 1; page <= wantPages; page++ {
		resp := app.GET(t, fmt.Sprintf("%s?per_page=2&page=%d", path, page), "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.EqualValues(t, wantPages, data["total_pages"])
		for _, it := range marketplaceItems(t, data) {
			ids = append(ids, it["id"].(string))
			names = append(names, it["name"].(string))
		}
	}
	return ids, names
}

func assertBeyondLastPage(t *testing.T, app *testutil.TestApp, path string, total int) {
	t.Helper()
	resp := app.GET(t, path+"?per_page=2&page=99", "")
	testutil.AssertStatus(t, resp, http.StatusOK)
	body, _ := io.ReadAll(resp.Body)
	assert.Contains(t, string(body), `"data":[]`)
	var data map[string]interface{}
	assert.NoError(t, json.Unmarshal(body, &data))
	assert.EqualValues(t, total, data["total"])
	assert.EqualValues(t, 99, data["page"])
}

func assertPagingFallback(t *testing.T, app *testutil.TestApp, path string) {
	t.Helper()
	resp := app.GET(t, path+"?page=abc&per_page=xyz", "")
	testutil.AssertStatus(t, resp, http.StatusOK)
	data := testutil.AssertJSON(t, resp)
	assert.EqualValues(t, 1, data["page"])
	assert.EqualValues(t, 20, data["per_page"])
}

func TestMarketplaceStoresPaging(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, accountID, _ := app.OwnerAuthHeader(t) // "Test Store"
	lowID := uuid.MustParse("00000000-0000-0000-0000-0000000000a1")
	highID := uuid.MustParse("ffffffff-ffff-ffff-ffff-0000000000a2")
	// Insert the higher id first so insertion order cannot explain the result.
	for _, s := range []struct {
		id         uuid.UUID
		name, slug string
	}{
		{highID, "Same Name", "same-high"},
		{lowID, "Same Name", "same-low"},
		{uuid.New(), "Alpha", "alpha"},
		{uuid.New(), "Zulu", "zulu"},
	} {
		if _, err := app.DB.Exec(context.Background(), `
			INSERT INTO stores (id, account_id, name, slug, status) VALUES ($1, $2, $3, $4, 'active')`,
			s.id, accountID, s.name, s.slug); err != nil {
			t.Fatalf("insert store: %v", err)
		}
	}

	t.Run("pages are ordered, complete and duplicate-free", func(t *testing.T) {
		ids, names := collectPages(t, app, "/marketplace/stores", 3)
		assert.Equal(t, []string{"Alpha", "Same Name", "Same Name", "Test Store", "Zulu"}, names)
		assert.Len(t, ids, 5)
		seen := map[string]bool{}
		for _, id := range ids {
			assert.False(t, seen[id], "duplicate id %s across pages", id)
			seen[id] = true
		}
		// name ties are broken by id ascending.
		assert.Equal(t, []string{lowID.String(), highID.String()}, ids[1:3])
	})

	t.Run("page beyond total_pages returns an empty array", func(t *testing.T) {
		assertBeyondLastPage(t, app, "/marketplace/stores", 5)
	})

	t.Run("non-numeric paging falls back to defaults", func(t *testing.T) {
		assertPagingFallback(t, app, "/marketplace/stores")
	})
}

func TestMarketplaceProductsPaging(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	store := uuid.MustParse(storeID)
	for _, name := range []string{"Echo", "Delta", "Delta", "Bravo", "Alpha"} {
		testutil.CreateTestProduct(t, app.DB, store, testutil.WithName(name))
	}

	t.Run("pages are ordered, complete and duplicate-free", func(t *testing.T) {
		ids, names := collectPages(t, app, "/marketplace/products", 3)
		assert.Equal(t, []string{"Alpha", "Bravo", "Delta", "Delta", "Echo"}, names)
		seen := map[string]bool{}
		for _, id := range ids {
			assert.False(t, seen[id], "duplicate id %s across pages", id)
			seen[id] = true
		}
		assert.Len(t, seen, 5)
		// name ties are broken by id ascending (uuid text order matches uuid order).
		assert.Less(t, ids[2], ids[3])
	})

	t.Run("page beyond total_pages returns an empty array", func(t *testing.T) {
		assertBeyondLastPage(t, app, "/marketplace/products", 5)
	})

	t.Run("non-numeric paging falls back to defaults", func(t *testing.T) {
		assertPagingFallback(t, app, "/marketplace/products")
	})
}
