package handlers_test

import (
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// shipping-zones REQ: Admin Zone/Method Management — minimal store-scoped
// CRUD (JWT + StoreContext) so shipping is configurable at all; without it
// shipping stays $0 (design: "gap found" — feature dead without this).
func TestAdminShippingZonesCRUD(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	base := "/stores/" + storeID + "/shipping-zones"

	t.Run("requires auth", func(t *testing.T) {
		resp := app.GET(t, base, "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("other owner cannot access store", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.GET(t, base, otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("creates a zone scoped to the store from StoreContext", func(t *testing.T) {
		resp := app.POST(t, base, map[string]interface{}{"name": "Colombia"}, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "Colombia", data["name"])
		assert.Equal(t, storeID, data["store_id"])
	})

	t.Run("rejects empty zone name", func(t *testing.T) {
		resp := app.POST(t, base, map[string]interface{}{"name": ""}, auth)
		testutil.AssertError(t, resp, http.StatusUnprocessableEntity, "name")
	})

	t.Run("creates a method under the zone and lists it nested", func(t *testing.T) {
		zoneResp := app.POST(t, base, map[string]interface{}{"name": "National"}, auth)
		testutil.AssertStatus(t, zoneResp, http.StatusCreated)
		zone := testutil.AssertJSON(t, zoneResp)
		zoneID, _ := zone["id"].(string)

		methodResp := app.POST(t, base+"/"+zoneID+"/methods", map[string]interface{}{
			"code":        "std",
			"name":        "Standard",
			"base_price":  5,
			"weight_rate": 0.1,
		}, auth)
		testutil.AssertStatus(t, methodResp, http.StatusCreated)
		method := testutil.AssertJSON(t, methodResp)
		methodID, _ := method["id"].(string)
		assert.Equal(t, "std", method["code"])
		assert.Equal(t, true, method["active"], "active defaults to true when omitted")

		listResp := app.GET(t, base, auth)
		testutil.AssertStatus(t, listResp, http.StatusOK)
		listData := testutil.AssertJSON(t, listResp)
		zones, _ := listData["zones"].([]interface{})
		require.NotEmpty(t, zones)

		var found map[string]interface{}
		for _, raw := range zones {
			z, _ := raw.(map[string]interface{})
			if z["id"] == zoneID {
				found = z
			}
		}
		require.NotNil(t, found, "created zone must be in the list")
		methods, _ := found["methods"].([]interface{})
		require.Len(t, methods, 1)
		firstMethod, _ := methods[0].(map[string]interface{})
		assert.Equal(t, methodID, firstMethod["id"])
	})

	t.Run("creating a method under an unknown zone returns 404", func(t *testing.T) {
		resp := app.POST(t, base+"/00000000-0000-0000-0000-000000000001/methods", map[string]interface{}{
			"code": "ghost", "name": "Ghost",
		}, auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("updates and deletes a method", func(t *testing.T) {
		zoneResp := app.POST(t, base, map[string]interface{}{"name": "Zone For Update"}, auth)
		zone := testutil.AssertJSON(t, zoneResp)
		zoneID, _ := zone["id"].(string)

		methodResp := app.POST(t, base+"/"+zoneID+"/methods", map[string]interface{}{
			"code": "upd", "name": "Update Me",
		}, auth)
		method := testutil.AssertJSON(t, methodResp)
		methodID, _ := method["id"].(string)

		updateResp := app.PUT(t, base+"/"+zoneID+"/methods/"+methodID, map[string]interface{}{
			"name":   "Updated Name",
			"active": false,
		}, auth)
		testutil.AssertStatus(t, updateResp, http.StatusOK)
		updated := testutil.AssertJSON(t, updateResp)
		assert.Equal(t, "Updated Name", updated["name"])
		assert.Equal(t, false, updated["active"])

		deleteResp := app.DELETE(t, base+"/"+zoneID+"/methods/"+methodID, auth)
		testutil.AssertStatus(t, deleteResp, http.StatusNoContent)

		deleteAgain := app.DELETE(t, base+"/"+zoneID+"/methods/"+methodID, auth)
		testutil.AssertStatus(t, deleteAgain, http.StatusNotFound)
	})

	t.Run("isolated stores: superadmin cannot update a method belonging to another store", func(t *testing.T) {
		zoneResp := app.POST(t, base, map[string]interface{}{"name": "Isolated Zone"}, auth)
		zone := testutil.AssertJSON(t, zoneResp)
		zoneID, _ := zone["id"].(string)
		methodResp := app.POST(t, base+"/"+zoneID+"/methods", map[string]interface{}{
			"code": "iso", "name": "Isolated",
		}, auth)
		method := testutil.AssertJSON(t, methodResp)
		methodID, _ := method["id"].(string)

		_, _, otherStoreID := app.OwnerAuthHeader(t)
		superAuth, _ := app.SuperAdminAuthHeader(t)
		resp := app.PUT(t, "/stores/"+otherStoreID+"/shipping-zones/"+zoneID+"/methods/"+methodID,
			map[string]interface{}{"name": "Hijacked"}, superAuth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})
}
