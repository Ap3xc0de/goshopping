package handlers_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateStoreTemplate(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	t.Run("accepts a known template_id and persists it", func(t *testing.T) {
		auth, _, storeID := app.OwnerAuthHeader(t)
		resp := app.PUT(t, "/stores/"+storeID+"/template",
			map[string]interface{}{"template_id": "minimal"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "minimal", data["template_id"])

		storeIDParsed := mustParseUUID(t, storeID)
		var persisted string
		require.NoError(t, app.DB.QueryRow(context.Background(),
			"SELECT template_id FROM stores WHERE id = $1", storeIDParsed).Scan(&persisted))
		assert.Equal(t, "minimal", persisted)
	})

	t.Run("rejects an unknown template_id and does not persist it", func(t *testing.T) {
		auth, _, storeID := app.OwnerAuthHeader(t)
		resp := app.PUT(t, "/stores/"+storeID+"/template",
			map[string]interface{}{"template_id": "does-not-exist"}, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)

		storeIDParsed := mustParseUUID(t, storeID)
		var persisted string
		require.NoError(t, app.DB.QueryRow(context.Background(),
			"SELECT template_id FROM stores WHERE id = $1", storeIDParsed).Scan(&persisted))
		assert.Equal(t, "minimal", persisted, "default template_id must be untouched")
	})

	t.Run("rejects an empty template_id", func(t *testing.T) {
		auth, _, storeID := app.OwnerAuthHeader(t)
		resp := app.PUT(t, "/stores/"+storeID+"/template",
			map[string]interface{}{"template_id": ""}, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)
	})

	t.Run("requires auth", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		resp := app.PUT(t, "/stores/"+storeID+"/template",
			map[string]interface{}{"template_id": "minimal"}, "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("other owner cannot update another store's template", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.PUT(t, "/stores/"+storeID+"/template",
			map[string]interface{}{"template_id": "minimal"}, otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})
}
