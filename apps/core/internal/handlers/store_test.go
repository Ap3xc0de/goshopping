package handlers_test

import (
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetStore covers the Seller Store Info Endpoint requirement: the owner
// gets {id, name, slug} for their own store, nothing sensitive leaks, and
// access is properly gated (401/403/404).
func TestGetStore(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeIDStr := app.OwnerAuthHeader(t)

	t.Run("owner fetches own store info with slug", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeIDStr, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)

		body, raw := rawAndJSON(t, resp)
		assert.Equal(t, storeIDStr, body["id"])
		assert.NotEmpty(t, body["name"])

		slug, ok := body["slug"].(string)
		require.True(t, ok, "response should carry slug")
		assert.NotEmpty(t, slug)

		// sensitive fields must never leave the server
		assert.NotContains(t, raw, "owner_id")
		assert.NotContains(t, raw, "account_id")
		assert.NotContains(t, raw, "template_id")
		assert.NotContains(t, raw, "config")
	})

	t.Run("requires auth", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeIDStr, "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("another owner cannot read this store", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.GET(t, "/stores/"+storeIDStr, otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("unknown store id returns 404 (superadmin)", func(t *testing.T) {
		sa, _ := app.SuperAdminAuthHeader(t)
		resp := app.GET(t, "/stores/00000000-0000-0000-0000-000000000001", sa)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})
}
