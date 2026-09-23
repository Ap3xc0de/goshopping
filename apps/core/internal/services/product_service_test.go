package services_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestProductService(app *testutil.TestApp) *services.ProductService {
	return services.NewProductService(app.DB, app.Config, services.NewEventService(app.Config))
}

func productNames(result *services.ListProductsResult) []string {
	names := make([]string, len(result.Products))
	for i, p := range result.Products {
		names[i] = p.Name
	}
	return names
}

// catalog-browsing REQ: Server-Side Sort Whitelist.
func TestProductServiceListProductsSort(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	svc := newTestProductService(app)

	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Cheap One"), testutil.WithPrice(5000))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Expensive"), testutil.WithPrice(30000))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Cheap Two"), testutil.WithPrice(5000))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Alpha"), testutil.WithPrice(10000))

	t.Run("unknown sort returns ErrInvalidSort naming allowed values", func(t *testing.T) {
		_, err := svc.ListProducts(storeIDParsed, 1, 24, "", "active", "", "popularity")
		require.Error(t, err)
		assert.True(t, errors.Is(err, services.ErrInvalidSort), "error should wrap ErrInvalidSort, got: %v", err)
		assert.Contains(t, err.Error(), "price_asc", "error must name allowed values")
		assert.Contains(t, err.Error(), "name")
	})

	t.Run("default (empty) sort is newest first", func(t *testing.T) {
		result, err := svc.ListProducts(storeIDParsed, 1, 24, "", "active", "", "")
		require.NoError(t, err)
		assert.Equal(t, "Alpha", result.Products[0].Name, "most recently created product must come first")
	})

	t.Run("price_asc orders null-safe ascending with deterministic secondary key", func(t *testing.T) {
		result, err := svc.ListProducts(storeIDParsed, 1, 24, "", "active", "", "price_asc")
		require.NoError(t, err)
		require.Len(t, result.Products, 4)
		assert.Equal(t, "5000", result.Products[0].Price.Decimal.String())
		assert.Equal(t, "5000", result.Products[1].Price.Decimal.String())
		assert.Equal(t, "10000", result.Products[2].Price.Decimal.String())
		assert.Equal(t, "30000", result.Products[3].Price.Decimal.String())
	})

	t.Run("price_desc orders descending", func(t *testing.T) {
		result, err := svc.ListProducts(storeIDParsed, 1, 24, "", "active", "", "price_desc")
		require.NoError(t, err)
		require.Len(t, result.Products, 4)
		assert.Equal(t, "Expensive", result.Products[0].Name)
	})

	t.Run("name sorts alphabetically", func(t *testing.T) {
		result, err := svc.ListProducts(storeIDParsed, 1, 24, "", "active", "", "name")
		require.NoError(t, err)
		assert.Equal(t, []string{"Alpha", "Cheap One", "Cheap Two", "Expensive"}, productNames(result))
	})
}

// catalog-browsing REQ: Accent-Insensitive Search — name+sku+description,
// accent-folded on both sides, LIKE metacharacters escaped.
func TestProductServiceListProductsSearch(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	svc := newTestProductService(app)

	bridon := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Bridón"))
	tiro := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithDescription("para caballos de tiro"))
	bySKU := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithSKU("HALTER-42"))

	percent := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("50% Off Halter"))
	percentish := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("50 Off Halter X"))
	underscore := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("A_B Saddle"))
	underscoreish := testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("AXB Saddle"))

	searchNames := func(t *testing.T, term string) []string {
		t.Helper()
		result, err := svc.ListProducts(storeIDParsed, 1, 24, "", "active", term, "")
		require.NoError(t, err)
		return productNames(result)
	}

	t.Run("accent-insensitive name match", func(t *testing.T) {
		assert.Contains(t, searchNames(t, "bridon"), bridon.Name)
	})

	t.Run("accented term matches description", func(t *testing.T) {
		assert.Contains(t, searchNames(t, "caballos"), tiro.Name)
	})

	t.Run("matches sku", func(t *testing.T) {
		assert.Contains(t, searchNames(t, "HALTER"), bySKU.Name)
	})

	t.Run("escapes LIKE percent wildcard", func(t *testing.T) {
		names := searchNames(t, "50%")
		assert.Contains(t, names, percent.Name)
		assert.NotContains(t, names, percentish.Name, "unescaped % would wildcard-match here")
	})

	t.Run("escapes LIKE underscore wildcard", func(t *testing.T) {
		names := searchNames(t, "A_B")
		assert.Contains(t, names, underscore.Name)
		assert.NotContains(t, names, underscoreish.Name, "unescaped _ would wildcard-match here")
	})
}

// catalog-browsing FEATURE: filtering by a parent category's slug must also
// return products assigned to any of its descendants (recursive), not just
// products assigned directly to that category. The legacy flat-string
// fallback (unknown slug → products.category) is untouched.
func TestProductServiceListProductsCategoryFilterIncludesDescendants(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	catSvc := services.NewCategoryService(app.DB)
	prodSvc := newTestProductService(app)
	ctx := context.Background()

	root, err := catSvc.CreateCategory(ctx, storeIDParsed, models.CreateCategoryRequest{Name: "Ropa"})
	require.NoError(t, err)
	child, err := catSvc.CreateCategory(ctx, storeIDParsed, models.CreateCategoryRequest{Name: "Botas", ParentID: &root.ID})
	require.NoError(t, err)
	grandchild, err := catSvc.CreateCategory(ctx, storeIDParsed, models.CreateCategoryRequest{Name: "Botas Altas", ParentID: &child.ID})
	require.NoError(t, err)

	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Root Product"), testutil.WithCategoryID(root.ID))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Child Product"), testutil.WithCategoryID(child.ID))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Grandchild Product"), testutil.WithCategoryID(grandchild.ID))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithName("Unrelated Product"))

	result, err := prodSvc.ListProducts(storeIDParsed, 1, 24, root.Slug, "active", "", "")
	require.NoError(t, err)
	assert.ElementsMatch(t, []string{"Root Product", "Child Product", "Grandchild Product"}, productNames(result))

	leafResult, err := prodSvc.ListProducts(storeIDParsed, 1, 24, grandchild.Slug, "active", "", "")
	require.NoError(t, err)
	assert.Equal(t, []string{"Grandchild Product"}, productNames(leafResult))
}
