package handlers_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetBranding(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("returns default branding for store without branding", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/branding", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		_, hasColors := data["colors"]
		assert.True(t, hasColors, "response should always include a colors object")
	})

	t.Run("requires auth", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeID+"/branding", "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("other owner cannot access store", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.GET(t, "/stores/"+storeID+"/branding", otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})
}

func TestUpdateBranding(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	t.Run("saves valid branding and round-trips it", func(t *testing.T) {
		auth, _, storeID := app.OwnerAuthHeader(t)
		body := map[string]interface{}{
			"brand_name": "Acme Store",
			"colors":     map[string]interface{}{"primary": "142 71% 45%"},
			"fonts":      map[string]interface{}{"heading": "Poppins", "body": "Inter"},
		}
		resp := app.PUT(t, "/stores/"+storeID+"/branding", body, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "Acme Store", data["brand_name"])

		getResp := app.GET(t, "/stores/"+storeID+"/branding", auth)
		getData := testutil.AssertJSON(t, getResp)
		assert.Equal(t, "Acme Store", getData["brand_name"])
		colors, _ := getData["colors"].(map[string]interface{})
		assert.Equal(t, "142 71% 45%", colors["primary"])
	})

	t.Run("rejects out-of-range HSL and does not persist", func(t *testing.T) {
		auth, _, storeID := app.OwnerAuthHeader(t)
		resp := app.PUT(t, "/stores/"+storeID+"/branding",
			map[string]interface{}{"colors": map[string]interface{}{"primary": "400 71% 45%"}}, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)

		getResp := app.GET(t, "/stores/"+storeID+"/branding", auth)
		getData := testutil.AssertJSON(t, getResp)
		colors, _ := getData["colors"].(map[string]interface{})
		assert.Empty(t, colors["primary"])
	})

	t.Run("rejects font outside whitelist", func(t *testing.T) {
		auth, _, storeID := app.OwnerAuthHeader(t)
		resp := app.PUT(t, "/stores/"+storeID+"/branding",
			map[string]interface{}{"fonts": map[string]interface{}{"heading": "Comic Sans MS"}}, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)
	})

	t.Run("rejects logo_url from external domain", func(t *testing.T) {
		auth, _, storeID := app.OwnerAuthHeader(t)
		resp := app.PUT(t, "/stores/"+storeID+"/branding",
			map[string]interface{}{"logo_url": "https://evil.com/logo.png"}, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)
	})

	t.Run("preserves other config keys on write", func(t *testing.T) {
		auth, _, storeID := app.OwnerAuthHeader(t)
		storeIDParsed := mustParseUUID(t, storeID)
		_, err := app.DB.Exec(context.Background(),
			`UPDATE stores SET config = '{"currency":"USD"}' WHERE id = $1`, storeIDParsed)
		require.NoError(t, err)

		resp := app.PUT(t, "/stores/"+storeID+"/branding",
			map[string]interface{}{"brand_name": "Preserved Test"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)

		var rawConfig []byte
		require.NoError(t, app.DB.QueryRow(context.Background(),
			"SELECT config FROM stores WHERE id = $1", storeIDParsed).Scan(&rawConfig))
		var cfg map[string]interface{}
		require.NoError(t, json.Unmarshal(rawConfig, &cfg))
		assert.Equal(t, "USD", cfg["currency"])
		branding, _ := cfg["branding"].(map[string]interface{})
		assert.Equal(t, "Preserved Test", branding["brand_name"])
	})

	t.Run("other owner cannot update another store's branding", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.PUT(t, "/stores/"+storeID+"/branding",
			map[string]interface{}{"brand_name": "Hijack"}, otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})
}

func TestBrandingLogoUpload(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)

	t.Run("returns presigned upload URL scoped to store", func(t *testing.T) {
		body := map[string]interface{}{"filename": "logo.png", "content_type": "image/png"}
		resp := app.POST(t, "/stores/"+storeID+"/branding/logo", body, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		uploadURL, _ := data["upload_url"].(string)
		imageURL, _ := data["image_url"].(string)
		assert.NotEmpty(t, uploadURL)
		assert.Contains(t, imageURL, fmt.Sprintf("branding/%s/", storeID))
	})

	t.Run("requires filename", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/branding/logo", map[string]interface{}{}, auth)
		testutil.AssertStatus(t, resp, http.StatusUnprocessableEntity)
	})

	t.Run("requires auth", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeID+"/branding/logo",
			map[string]interface{}{"filename": "logo.png"}, "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})
}
