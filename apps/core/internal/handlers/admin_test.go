package handlers_test

import (
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestAdminDashboard(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	adminAuth, _ := app.SuperAdminAuthHeader(t)
	_, _, _ = app.OwnerAuthHeader(t) // create some data

	t.Run("superadmin can access", func(t *testing.T) {
		resp := app.GET(t, "/admin/dashboard", adminAuth)
		testutil.AssertStatus(t, resp, http.StatusOK)
	})

	t.Run("owner cannot access", func(t *testing.T) {
		ownerAuth, _, _ := app.OwnerAuthHeader(t)
		resp := app.GET(t, "/admin/dashboard", ownerAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("unauthenticated gets 401", func(t *testing.T) {
		resp := app.GET(t, "/admin/dashboard", "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})
}

func TestAdminListAccounts(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	adminAuth, _ := app.SuperAdminAuthHeader(t)
	app.OwnerAuthHeader(t) // creates an account

	t.Run("returns all accounts", func(t *testing.T) {
		resp := app.GET(t, "/admin/accounts", adminAuth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		total, _ := data["total"].(float64)
		assert.GreaterOrEqual(t, total, float64(1))
	})

	t.Run("search by email", func(t *testing.T) {
		resp := app.GET(t, "/admin/accounts?search=owner", adminAuth)
		testutil.AssertStatus(t, resp, http.StatusOK)
	})
}

func TestAdminListStores(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	adminAuth, _ := app.SuperAdminAuthHeader(t)
	app.OwnerAuthHeader(t) // creates a store

	t.Run("returns all stores", func(t *testing.T) {
		resp := app.GET(t, "/admin/stores", adminAuth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		total, _ := data["total"].(float64)
		assert.GreaterOrEqual(t, total, float64(1))
	})
}

func TestAdminUpdateAccount(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	adminAuth, _ := app.SuperAdminAuthHeader(t)
	_, ownerID, _ := app.OwnerAuthHeader(t)

	t.Run("suspends account", func(t *testing.T) {
		resp := app.PATCH(t, "/admin/accounts/"+ownerID,
			map[string]interface{}{"status": "suspended"}, adminAuth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "suspended", data["status"])
	})

	t.Run("returns 422 with missing status", func(t *testing.T) {
		resp := app.PATCH(t, "/admin/accounts/"+ownerID, map[string]interface{}{}, adminAuth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "status required")
	})
}

func TestAdminUpdateStore(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	adminAuth, _ := app.SuperAdminAuthHeader(t)
	_, _, storeID := app.OwnerAuthHeader(t)

	t.Run("suspends store", func(t *testing.T) {
		resp := app.PATCH(t, "/admin/stores/"+storeID,
			map[string]interface{}{"status": "suspended"}, adminAuth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "suspended", data["status"])
	})
}

func TestAdminAuditLog(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	adminAuth, _ := app.SuperAdminAuthHeader(t)

	t.Run("returns empty audit log", func(t *testing.T) {
		resp := app.GET(t, "/admin/audit-log", adminAuth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 0)
	})
}
