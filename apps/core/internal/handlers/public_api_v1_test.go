package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupAPIV1Store creates an owner store plus a valid API key and returns
// everything the /api/v1 tests need, including the owner's auth header so
// tests can administrate the same store (e.g. revoke a key).
func setupAPIV1Store(t *testing.T, app *testutil.TestApp) (storeID uuid.UUID, storeIDStr, slug, keyAuth, plaintext, ownerAuth string) {
	t.Helper()
	ownerAuth, _, storeIDStr = app.OwnerAuthHeader(t)
	storeID = mustParseUUID(t, storeIDStr)
	slug = testutil.GetStoreSlug(t, app.DB, storeID)

	_, plaintext = testutil.CreateTestAPIKey(t, app.DB, storeID, "V1 test key")
	return storeID, storeIDStr, slug, testutil.APIKeyAuthHeader(plaintext), plaintext, ownerAuth
}

// TestAPIV1CategoriesMatchesPublic verifies GET /categories parity between the
// two surfaces (storefront-developer-api REQ: Versioned Endpoint Group).
func TestAPIV1CategoriesMatchesPublic(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	storeID, _, slug, keyAuth, _, _ := setupAPIV1Store(t, app)
	testutil.CreateTestCategory(t, app.DB, storeID,
		testutil.WithCategoryName("Tack"), testutil.WithCategorySlug("tack"))

	pubResp := app.GET(t, "/public/"+slug+"/categories", "")
	testutil.AssertStatus(t, pubResp, http.StatusOK)

	v1Resp := app.GET(t, "/api/v1/"+slug+"/categories", keyAuth)
	testutil.AssertStatus(t, v1Resp, http.StatusOK)

	assert.JSONEq(t, string(readRawBody(t, pubResp)), string(readRawBody(t, v1Resp)),
		"/api/v1 categories must match /public categories exactly")
}

// TestAPIV1CategoriesRequiresKey ensures the categories route sits behind the
// API key middleware like every other /api/v1 route.
func TestAPIV1CategoriesRequiresKey(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, slug, _, _, _ := setupAPIV1Store(t, app)

	resp := app.GET(t, "/api/v1/"+slug+"/categories", "")
	testutil.AssertStatus(t, resp, http.StatusUnauthorized)
}

// TestAPIV1ConfigMatchesPublic verifies the versioned endpoint serves exactly
// the same JSON shape as the existing /public endpoint — only the
// authentication differs.
func TestAPIV1ConfigMatchesPublic(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, slug, keyAuth, _, _ := setupAPIV1Store(t, app)

	pubResp := app.GET(t, "/public/"+slug+"/config", "")
	testutil.AssertStatus(t, pubResp, http.StatusOK)
	pubData := testutil.AssertJSON(t, pubResp)

	v1Resp := app.GET(t, "/api/v1/"+slug+"/config", keyAuth)
	testutil.AssertStatus(t, v1Resp, http.StatusOK)
	v1Data := testutil.AssertJSON(t, v1Resp)

	require.Equal(t, pubData, v1Data, "/api/v1 config must match /public config exactly")
}

// TestAPIV1ProductsMatchesPublic verifies list-products parity between the two
// surfaces.
func TestAPIV1ProductsMatchesPublic(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	storeID, _, slug, keyAuth, _, _ := setupAPIV1Store(t, app)
	testutil.CreateTestProduct(t, app.DB, storeID, testutil.WithName("V1 Product"), testutil.WithPrice(10000))

	pubResp := app.GET(t, "/public/"+slug+"/products", "")
	testutil.AssertStatus(t, pubResp, http.StatusOK)
	pubData := testutil.AssertJSON(t, pubResp)

	v1Resp := app.GET(t, "/api/v1/"+slug+"/products", keyAuth)
	testutil.AssertStatus(t, v1Resp, http.StatusOK)
	v1Data := testutil.AssertJSON(t, v1Resp)

	require.Equal(t, pubData["data"], v1Data["data"], "product lists must match exactly")
	assert.Equal(t, pubData["total"], v1Data["total"])
}

// TestAPIV1CreateOrderAndStatus runs the quote → order → status flow through
// the versioned endpoints.
func TestAPIV1CreateOrderAndStatus(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	storeID, _, slug, keyAuth, _, _ := setupAPIV1Store(t, app)
	p := testutil.CreateTestProduct(t, app.DB, storeID, testutil.WithPrice(10000), testutil.WithStock(5))

	t.Run("quote works with a developer key", func(t *testing.T) {
		body := map[string]interface{}{
			"items": []map[string]interface{}{{"product_id": p.ID.String(), "quantity": 2}},
		}
		resp := app.POST(t, "/api/v1/"+slug+"/quote", body, keyAuth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		_, hasTotal := data["total"]
		assert.True(t, hasTotal, "quote response should include total")
	})

	t.Run("order creation returns an access token, then status resolves with it", func(t *testing.T) {
		orderBody := map[string]interface{}{
			"customer_name": "API Customer",
			"items": []map[string]interface{}{
				{"product_id": p.ID.String(), "quantity": 1},
			},
			"payment_method": "cash",
		}
		createResp := app.POST(t, "/api/v1/"+slug+"/orders", orderBody, keyAuth)
		testutil.AssertStatus(t, createResp, http.StatusCreated)
		created := testutil.AssertJSON(t, createResp)

		token, ok := created["access_token"].(string)
		require.True(t, ok, "response should include access_token")
		order, ok := created["order"].(map[string]interface{})
		require.True(t, ok, "response should include order")
		orderID, ok := order["id"].(string)
		require.True(t, ok, "order should include id")

		statusResp := app.GET(t, fmt.Sprintf("/api/v1/%s/orders/%s/status?token=%s", slug, orderID, token), keyAuth)
		testutil.AssertStatus(t, statusResp, http.StatusOK)
		data := testutil.AssertJSON(t, statusResp)
		assert.Equal(t, "pending", data["status"])
		assert.Equal(t, "pending", data["payment_status"])
	})
}

// TestAPIV1AuthMatrix covers the Bearer auth matrix end to end through the
// router: every failure mode maps to 401/403 exactly as the spec dictates, and
// a valid key returns 200 before revocation and 401 after.
func TestAPIV1AuthMatrix(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	storeID, storeIDStr, slug, _, _, ownerAuth := setupAPIV1Store(t, app)

	revocableKey, revocablePlain := testutil.CreateTestAPIKey(t, app.DB, storeID, "Matrix revocable key")
	revocableAuth := testutil.APIKeyAuthHeader(revocablePlain)

	t.Run("missing header", func(t *testing.T) {
		resp := app.GET(t, "/api/v1/"+slug+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("malformed header", func(t *testing.T) {
		resp := app.GETWithHeaders(t, "/api/v1/"+slug+"/config", map[string]string{"Authorization": "Basic abc123"})
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("unknown key", func(t *testing.T) {
		resp := app.GET(t, "/api/v1/"+slug+"/config",
			testutil.APIKeyAuthHeader("gsk_0000000000000000000000000000000000000000"))
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("expired key", func(t *testing.T) {
		expiredKey, expiredPlain := testutil.CreateTestAPIKey(t, app.DB, storeID, "Matrix expired key")
		_, err := app.DB.Exec(context.Background(),
			`UPDATE store_api_keys SET expires_at = NOW() - interval '1 hour' WHERE id = $1`, expiredKey.ID)
		require.NoError(t, err)
		resp := app.GET(t, "/api/v1/"+slug+"/config", testutil.APIKeyAuthHeader(expiredPlain))
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("inactive key", func(t *testing.T) {
		inactiveKey, inactivePlain := testutil.CreateTestAPIKey(t, app.DB, storeID, "Matrix inactive key")
		_, err := app.DB.Exec(context.Background(),
			`UPDATE store_api_keys SET active = false WHERE id = $1`, inactiveKey.ID)
		require.NoError(t, err)
		resp := app.GET(t, "/api/v1/"+slug+"/config", testutil.APIKeyAuthHeader(inactivePlain))
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("key from another store", func(t *testing.T) {
		_, _, otherSlug, _, _, _ := setupAPIV1Store(t, app)
		resp := app.GET(t, "/api/v1/"+otherSlug+"/config", revocableAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("valid key returns 200 and is 401 after revocation", func(t *testing.T) {
		before := app.GET(t, "/api/v1/"+slug+"/config", revocableAuth)
		testutil.AssertStatus(t, before, http.StatusOK)

		// Revoke through the admin route as the store owner.
		deleteResp := app.DELETE(t, "/stores/"+storeIDStr+"/api-keys/"+revocableKey.ID.String(), ownerAuth)
		testutil.AssertStatus(t, deleteResp, http.StatusNoContent)

		after := app.GET(t, "/api/v1/"+slug+"/config", revocableAuth)
		testutil.AssertStatus(t, after, http.StatusUnauthorized)
	})
}

// TestPublicRoutesUnchanged guards the regression requirement: /public/*
// still serves the same data and requires no Bearer key.
func TestPublicRoutesUnchanged(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	storeID, _, slug, _, _, _ := setupAPIV1Store(t, app)
	p := testutil.CreateTestProduct(t, app.DB, storeID, testutil.WithPrice(10000), testutil.WithStock(10))

	t.Run("public config still serves without any auth", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, slug, data["slug"])
	})

	t.Run("public quote still works", func(t *testing.T) {
		body := map[string]interface{}{
			"items": []map[string]interface{}{{"product_id": p.ID.String(), "quantity": 1}},
		}
		resp := app.POST(t, "/public/"+slug+"/quote", body, "")
		testutil.AssertStatus(t, resp, http.StatusOK)
	})

	t.Run("public product detail does not expose cost", func(t *testing.T) {
		resp := app.GET(t, "/public/"+slug+"/products/"+p.ID.String(), "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		_, hasCost := data["cost"]
		assert.False(t, hasCost, "public endpoint should not expose cost")
	})
}
