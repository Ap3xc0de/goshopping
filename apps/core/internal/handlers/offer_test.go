package handlers_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestListOffers(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("empty store returns empty paginated list", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/offers", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		testutil.AssertPaginated(t, data, 0)
	})

	t.Run("requires auth", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/offers", "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("other owner cannot access store", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.GET(t, "/stores/"+storeID+"/offers", otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})
}

func TestCreateOffer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("creates offer successfully", func(t *testing.T) {
		body := map[string]interface{}{
			"name":           "Launch Sale",
			"discount_type":  "percentage",
			"discount_value": 15,
		}
		resp := app.POST(t, "/stores/"+storeID+"/offers", body, auth)
		testutil.AssertStatus(t, resp, http.StatusCreated)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "Launch Sale", data["name"])
		assert.Equal(t, "store", data["scope"])
	})

	t.Run("returns 422 when scope_value missing for category scope", func(t *testing.T) {
		body := map[string]interface{}{
			"name":           "Bad Offer",
			"discount_type":  "percentage",
			"discount_value": 10,
			"scope":          "category",
		}
		resp := app.POST(t, "/stores/"+storeID+"/offers", body, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)
	})

	t.Run("returns 422 for invalid discount_type", func(t *testing.T) {
		body := map[string]interface{}{
			"name":           "Bad Type",
			"discount_type":  "bogus",
			"discount_value": 10,
		}
		resp := app.POST(t, "/stores/"+storeID+"/offers", body, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)
	})
}

func TestGetOffer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	createResp := app.POST(t, "/stores/"+storeID+"/offers", map[string]interface{}{
		"name": "Findable", "discount_type": "percentage", "discount_value": 10,
	}, auth)
	testutil.AssertStatus(t, createResp, http.StatusCreated)
	created := testutil.AssertJSON(t, createResp)
	offerID, hasID := created["id"].(string)
	assert.True(t, hasID, "created offer response should include id")

	t.Run("returns the offer", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/offers/%s", storeID, offerID), auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, offerID, data["id"])
	})

	t.Run("returns 404 for unknown offer", func(t *testing.T) {
		resp := app.GET(t, fmt.Sprintf("/stores/%s/offers/00000000-0000-0000-0000-000000000001", storeID), auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("other owner cannot access this store's offers", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.GET(t, fmt.Sprintf("/stores/%s/offers/%s", storeID, offerID), otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("offer scoped to a different store than the URL is not found, even for a superadmin", func(t *testing.T) {
		_, _, otherStoreID := app.OwnerAuthHeader(t)
		superAuth, _ := app.SuperAdminAuthHeader(t)
		resp := app.GET(t, fmt.Sprintf("/stores/%s/offers/%s", otherStoreID, offerID), superAuth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})
}

func TestUpdateOffer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	createResp := app.POST(t, "/stores/"+storeID+"/offers", map[string]interface{}{
		"name": "Original", "discount_type": "percentage", "discount_value": 10,
	}, auth)
	created := testutil.AssertJSON(t, createResp)
	offerID, _ := created["id"].(string)

	t.Run("partial update succeeds", func(t *testing.T) {
		resp := app.PUT(t, fmt.Sprintf("/stores/%s/offers/%s", storeID, offerID),
			map[string]interface{}{"name": "Updated"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "Updated", data["name"])
	})

	t.Run("returns 404 for unknown offer", func(t *testing.T) {
		resp := app.PUT(t, fmt.Sprintf("/stores/%s/offers/00000000-0000-0000-0000-000000000001", storeID),
			map[string]interface{}{"name": "Nope"}, auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("returns 422 for invalid update", func(t *testing.T) {
		resp := app.PUT(t, fmt.Sprintf("/stores/%s/offers/%s", storeID, offerID),
			map[string]interface{}{"discount_type": "bogus"}, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)
	})
}

func TestDeleteOffer(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	createResp := app.POST(t, "/stores/"+storeID+"/offers", map[string]interface{}{
		"name": "Doomed", "discount_type": "percentage", "discount_value": 10,
	}, auth)
	created := testutil.AssertJSON(t, createResp)
	offerID, _ := created["id"].(string)

	t.Run("deletes the offer", func(t *testing.T) {
		resp := app.DELETE(t, fmt.Sprintf("/stores/%s/offers/%s", storeID, offerID), auth)
		testutil.AssertStatus(t, resp, http.StatusNoContent)

		getResp := app.GET(t, fmt.Sprintf("/stores/%s/offers/%s", storeID, offerID), auth)
		testutil.AssertStatus(t, getResp, http.StatusNotFound)
	})
}
