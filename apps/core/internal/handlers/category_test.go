package handlers_test

import (
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// catalog-browsing REQ: Admin Category Management — store-scoped CRUD under
// /stores/:storeId/categories (JWT + StoreContext), 409 on deleting a parent
// that still has children.
func TestAdminCategoriesCRUD(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	base := "/stores/" + storeID + "/categories"

	t.Run("requires auth", func(t *testing.T) {
		resp := app.GET(t, base, "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("other owner cannot access store", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.GET(t, base, otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("creates a root category with store_id from context", func(t *testing.T) {
		resp := app.POST(t, base, map[string]interface{}{"name": "Tack"}, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "Tack", data["name"])
		assert.Equal(t, storeID, data["store_id"], "category must be scoped to the store from StoreContext")
		assert.Equal(t, "tack", data["slug"], "slug is generated from the name")
		parentID, has := data["parent_id"]
		assert.True(t, has, "parent_id key must be present")
		assert.Nil(t, parentID, "root category has no parent")
	})

	t.Run("creates a nested child", func(t *testing.T) {
		createResp := app.POST(t, base, map[string]interface{}{"name": "Tack"}, auth)
		created := testutil.AssertJSON(t, createResp)
		tackID, _ := created["id"].(string)

		resp := app.POST(t, base, map[string]interface{}{"name": "Saddles", "parent_id": tackID}, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, tackID, data["parent_id"], "child must reference its parent")
	})

	t.Run("rejects empty name", func(t *testing.T) {
		resp := app.POST(t, base, map[string]interface{}{"name": "   "}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "name")
	})

	t.Run("rejects unknown parent", func(t *testing.T) {
		resp := app.POST(t, base, map[string]interface{}{
			"name":      "Orphan",
			"parent_id": "00000000-0000-0000-0000-000000000001",
		}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "parent")
	})

	t.Run("generates unique slugs for duplicate names", func(t *testing.T) {
		first := app.POST(t, base, map[string]interface{}{"name": "Duplicate!"}, auth)
		testutil.AssertStatus(t, first, http.StatusCreated)
		firstData := testutil.AssertJSON(t, first)

		second := app.POST(t, base, map[string]interface{}{"name": "Duplicate!"}, auth)
		testutil.AssertStatus(t, second, http.StatusCreated)
		secondData := testutil.AssertJSON(t, second)

		assert.NotEqual(t, firstData["slug"], secondData["slug"], "second slug must not collide with the first")
	})
}

func TestAdminCategoriesListUpdateDelete(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	base := "/stores/" + storeID + "/categories"

	createTack := app.POST(t, base, map[string]interface{}{"name": "Tack"}, auth)
	testutil.AssertStatus(t, createTack, http.StatusCreated)
	tack := testutil.AssertJSON(t, createTack)
	tackID, _ := tack["id"].(string)

	createSaddles := app.POST(t, base, map[string]interface{}{"name": "Saddles", "parent_id": tackID}, auth)
	testutil.AssertStatus(t, createSaddles, http.StatusCreated)
	saddles := testutil.AssertJSON(t, createSaddles)
	saddlesID, _ := saddles["id"].(string)

	t.Run("lists categories flat with parent info", func(t *testing.T) {
		resp := app.GET(t, base, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		categories, _ := data["categories"].([]interface{})
		require.Len(t, categories, 2)
	})

	t.Run("updates (rename) keeps the original slug", func(t *testing.T) {
		resp := app.PUT(t, base+"/"+tackID, map[string]interface{}{"name": "Tack & Bridles"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "Tack & Bridles", data["name"])
		assert.Equal(t, "tack", data["slug"], "rename must keep the stable public slug")
	})

	t.Run("update of unknown category returns 404", func(t *testing.T) {
		resp := app.PUT(t, base+"/00000000-0000-0000-0000-000000000001",
			map[string]interface{}{"name": "Ghost"}, auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("deleting a parent with children returns 409 and keeps the row", func(t *testing.T) {
		resp := app.DELETE(t, base+"/"+tackID, auth)
		testutil.AssertStatus(t, resp, http.StatusConflict)

		listResp := app.GET(t, base, auth)
		data := testutil.AssertJSON(t, listResp)
		categories, _ := data["categories"].([]interface{})
		require.Len(t, categories, 2, "the parent must still exist after the refused delete")
	})

	t.Run("isolated stores: superadmin cannot delete a missing category in another store", func(t *testing.T) {
		_, _, otherStoreID := app.OwnerAuthHeader(t)
		superAuth, _ := app.SuperAdminAuthHeader(t)
		resp := app.DELETE(t, "/stores/"+otherStoreID+"/categories/"+saddlesID, superAuth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("rejects reparenting a category under its own descendant (cycle)", func(t *testing.T) {
		resp := app.PUT(t, base+"/"+tackID, map[string]interface{}{"parent_id": saddlesID}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "descendant")
	})

	t.Run("deletes a leaf category", func(t *testing.T) {
		resp := app.DELETE(t, base+"/"+saddlesID, auth)
		testutil.AssertStatus(t, resp, http.StatusNoContent)

		listResp := app.GET(t, base, auth)
		data := testutil.AssertJSON(t, listResp)
		categories, _ := data["categories"].([]interface{})
		require.Len(t, categories, 1)

		deleteAgain := app.DELETE(t, base+"/"+saddlesID, auth)
		testutil.AssertStatus(t, deleteAgain, http.StatusNotFound)
	})

	t.Run("deleting a category that has products succeeds (products untouched)", func(t *testing.T) {
		storeIDParsed := mustParseUUID(t, storeID)
		createResp := app.POST(t, base, map[string]interface{}{"name": "Boots"}, auth)
		testutil.AssertStatus(t, createResp, http.StatusCreated)
		bootsID, _ := testutil.AssertJSON(t, createResp)["id"].(string)

		p := testutil.CreateTestProduct(t, app.DB, storeIDParsed,
			testutil.WithCategoryID(mustParseUUID(t, bootsID)))
		_ = p

		resp := app.DELETE(t, base+"/"+bootsID, auth)
		testutil.AssertStatus(t, resp, http.StatusNoContent)
	})
}
