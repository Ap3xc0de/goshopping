package services_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestCategoryService(app *testutil.TestApp) *services.CategoryService {
	return services.NewCategoryService(app.DB)
}

// findNode is a small test helper to locate a node by name in a []CategoryNode
// slice (tree assembly must never be assumed stable across bug fixes, so
// tests look nodes up by name rather than by index).
func findNode(nodes []models.CategoryNode, name string) *models.CategoryNode {
	for i := range nodes {
		if nodes[i].Name == name {
			return &nodes[i]
		}
	}
	return nil
}

// catalog-browsing BUG: ListCategoryTree assembled nodes by VALUE
// ("parent.Children = append(parent.Children, *node)"), so when a parent was
// scanned (sort_order ASC, name ASC) BEFORE its child, the parent's copy was
// already placed into the tree before the child got appended to the live
// node — the child silently vanished. "Monturas" sorts before "Salto"
// alphabetically, so this reproduces the bug the old "Saddles"-before-"Tack"
// test setup could never catch.
func TestCategoryServiceListCategoryTree_ParentSortsBeforeChild(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	svc := newTestCategoryService(app)

	monturas := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Monturas"), testutil.WithCategorySlug("monturas"))
	testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Salto"), testutil.WithCategorySlug("salto"),
		testutil.WithParent(monturas.ID))

	tree, err := svc.ListCategoryTree(context.Background(), storeIDParsed)
	require.NoError(t, err)
	require.Len(t, tree, 1, "Monturas is the only root")

	root := findNode(tree, "Monturas")
	require.NotNil(t, root)
	require.Len(t, root.Children, 1, "Salto must not be lost even though its parent sorts first")
	assert.Equal(t, "Salto", root.Children[0].Name)
}

// Same bug, three levels deep: root, child and grandchild all sort in
// parent-before-child order ("Ropa" < "Ropa Salto" < "Ropa Salto Casco").
func TestCategoryServiceListCategoryTree_ThreeLevelsParentSortsFirst(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	svc := newTestCategoryService(app)

	root := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Ropa"), testutil.WithCategorySlug("ropa"))
	child := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Ropa Salto"), testutil.WithCategorySlug("ropa-salto"),
		testutil.WithParent(root.ID))
	testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Ropa Salto Casco"), testutil.WithCategorySlug("ropa-salto-casco"),
		testutil.WithParent(child.ID))

	tree, err := svc.ListCategoryTree(context.Background(), storeIDParsed)
	require.NoError(t, err)
	require.Len(t, tree, 1)

	rootNode := findNode(tree, "Ropa")
	require.NotNil(t, rootNode)
	require.Len(t, rootNode.Children, 1, "child must not be lost")

	childNode := findNode(rootNode.Children, "Ropa Salto")
	require.NotNil(t, childNode)
	require.Len(t, childNode.Children, 1, "grandchild must not be lost")
	assert.Equal(t, "Ropa Salto Casco", childNode.Children[0].Name)
}

// catalog-browsing FEATURE: each node carries ParentID/Depth/SortOrder/Path so
// the storefront can render breadcrumbs without extra lookups.
func TestCategoryServiceListCategoryTree_TreeMetadata(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	svc := newTestCategoryService(app)

	root := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Monturas"), testutil.WithCategorySlug("monturas"), testutil.WithSortOrder(1))
	child := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Salto"), testutil.WithCategorySlug("salto"),
		testutil.WithParent(root.ID), testutil.WithSortOrder(2))

	tree, err := svc.ListCategoryTree(context.Background(), storeIDParsed)
	require.NoError(t, err)

	rootNode := findNode(tree, "Monturas")
	require.NotNil(t, rootNode)
	assert.Nil(t, rootNode.ParentID, "root has no parent")
	assert.Equal(t, 0, rootNode.Depth)
	assert.Equal(t, 1, rootNode.SortOrder)
	require.Len(t, rootNode.Path, 1, "path is root-to-node inclusive")
	assert.Equal(t, "Monturas", rootNode.Path[0].Name)
	assert.Equal(t, root.Slug, rootNode.Path[0].Slug)

	childNode := findNode(rootNode.Children, "Salto")
	require.NotNil(t, childNode)
	require.NotNil(t, childNode.ParentID)
	assert.Equal(t, root.ID, *childNode.ParentID)
	assert.Equal(t, 1, childNode.Depth)
	assert.Equal(t, 2, childNode.SortOrder)
	require.Len(t, childNode.Path, 2, "path includes the whole root-to-node chain")
	assert.Equal(t, "Monturas", childNode.Path[0].Name)
	assert.Equal(t, child.Slug, childNode.Path[1].Slug)
}

// catalog-browsing FEATURE: TotalProductCount is the DISTINCT count of active
// products in a node plus all its descendants. A product has a single
// category_id, so summing direct counts up the tree can never double-count —
// this test asserts the rollup across three levels with an inactive product
// mixed in (must not count).
func TestCategoryServiceListCategoryTree_TotalProductCountRollup(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	svc := newTestCategoryService(app)

	root := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Monturas"), testutil.WithCategorySlug("monturas"))
	child := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Salto"), testutil.WithCategorySlug("salto"), testutil.WithParent(root.ID))
	grandchild := testutil.CreateTestCategory(t, app.DB, storeIDParsed,
		testutil.WithCategoryName("Salto Cerrado"), testutil.WithCategorySlug("salto-cerrado"), testutil.WithParent(child.ID))

	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithCategoryID(root.ID))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithCategoryID(child.ID))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithCategoryID(child.ID))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithCategoryID(grandchild.ID))
	testutil.CreateTestProduct(t, app.DB, storeIDParsed, testutil.WithCategoryID(grandchild.ID), testutil.WithStatus("inactive"))

	tree, err := svc.ListCategoryTree(context.Background(), storeIDParsed)
	require.NoError(t, err)

	rootNode := findNode(tree, "Monturas")
	require.NotNil(t, rootNode)
	assert.Equal(t, 1, rootNode.ProductCount, "direct count unchanged")
	assert.Equal(t, 4, rootNode.TotalProductCount, "1 (root) + 2 (child) + 1 (grandchild active); inactive excluded")

	childNode := findNode(rootNode.Children, "Salto")
	require.NotNil(t, childNode)
	assert.Equal(t, 2, childNode.ProductCount)
	assert.Equal(t, 3, childNode.TotalProductCount, "2 (child) + 1 (grandchild active)")

	grandchildNode := findNode(childNode.Children, "Salto Cerrado")
	require.NotNil(t, grandchildNode)
	assert.Equal(t, 1, grandchildNode.ProductCount, "inactive product excluded from direct count")
	assert.Equal(t, 1, grandchildNode.TotalProductCount)
}

// catalog-browsing BUG: UpdateCategory only rejected a category becoming its
// own parent, not a cycle through a descendant (A→B→A). This must be rejected
// with a validation error at the service layer.
func TestCategoryServiceUpdateCategory_RejectsDescendantCycle(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := uuid.MustParse(storeID)
	svc := newTestCategoryService(app)
	ctx := context.Background()

	a := testutil.CreateTestCategory(t, app.DB, storeIDParsed, testutil.WithCategoryName("A"), testutil.WithCategorySlug("a"))
	b := testutil.CreateTestCategory(t, app.DB, storeIDParsed, testutil.WithCategoryName("B"), testutil.WithCategorySlug("b"), testutil.WithParent(a.ID))
	c := testutil.CreateTestCategory(t, app.DB, storeIDParsed, testutil.WithCategoryName("C"), testutil.WithCategorySlug("c"), testutil.WithParent(b.ID))

	t.Run("direct cycle: A's parent cannot become B (its own child)", func(t *testing.T) {
		_, err := svc.UpdateCategory(ctx, storeIDParsed, a.ID, models.UpdateCategoryRequest{ParentID: &b.ID})
		require.Error(t, err)
	})

	t.Run("transitive cycle: A's parent cannot become C (its grandchild)", func(t *testing.T) {
		_, err := svc.UpdateCategory(ctx, storeIDParsed, a.ID, models.UpdateCategoryRequest{ParentID: &c.ID})
		require.Error(t, err)
	})

	t.Run("unrelated reparenting still works", func(t *testing.T) {
		d := testutil.CreateTestCategory(t, app.DB, storeIDParsed, testutil.WithCategoryName("D"), testutil.WithCategorySlug("d"))
		updated, err := svc.UpdateCategory(ctx, storeIDParsed, c.ID, models.UpdateCategoryRequest{ParentID: &d.ID})
		require.NoError(t, err)
		require.NotNil(t, updated.ParentID)
		assert.Equal(t, d.ID, *updated.ParentID)
	})
}
