package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// seedStoreDomain inserts a store_domains row for storeID and returns the
// hostname. OwnerAuthHeader creates its store via raw SQL and never touches
// store_domains, so any test needing a domain must insert one explicitly.
func seedStoreDomain(t *testing.T, app *testutil.TestApp, storeID uuid.UUID, hostname, status string) {
	t.Helper()
	if _, err := app.DB.Exec(context.Background(), `
		INSERT INTO store_domains (store_id, hostname, kind, status, is_primary)
		VALUES ($1, $2, 'generic', $3, true)`,
		storeID, hostname, status,
	); err != nil {
		t.Fatalf("seedStoreDomain: %v", err)
	}
}

func TestPublicConfigByDomain(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	_, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)
	slug := testutil.GetStoreSlug(t, app.DB, storeIDParsed)
	hostname := fmt.Sprintf("domain-cfg-%s.goshopping.com", storeIDParsed)
	seedStoreDomain(t, app, storeIDParsed, hostname, "active")

	// REQ-RESOLVE-01
	t.Run("unknown host returns 404 not 401", func(t *testing.T) {
		resp := app.GET(t, "/public/by-domain/no-existe.goshopping.com/config", "")
		testutil.AssertStatus(t, resp, http.StatusNotFound)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, "store not found", data["error"])
	})

	// REQ-RESOLVE-02
	t.Run("resolves regardless of case", func(t *testing.T) {
		resp := app.GET(t, "/public/by-domain/"+upper(hostname)+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, slug, data["slug"])
	})

	t.Run("resolves with www prefix", func(t *testing.T) {
		resp := app.GET(t, "/public/by-domain/www."+hostname+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, slug, data["slug"])
	})

	// REQ-RESOLVE-03
	t.Run("same shape and template_id as the slug endpoint", func(t *testing.T) {
		byHost := app.GET(t, "/public/by-domain/"+hostname+"/config", "")
		testutil.AssertStatus(t, byHost, http.StatusOK)
		hostData := testutil.AssertJSON(t, byHost)

		bySlug := app.GET(t, "/public/"+slug+"/config", "")
		testutil.AssertStatus(t, bySlug, http.StatusOK)
		slugData := testutil.AssertJSON(t, bySlug)

		assert.ElementsMatch(t, keys(hostData), keys(slugData), "both endpoints must return the same top-level keys")

		templateID, ok := hostData["template_id"]
		assert.True(t, ok, "by-domain response must carry a template_id key")
		assert.Equal(t, slugData["template_id"], templateID, "template_id must match between both endpoints")
	})

	// REQ-RESOLVE-04
	t.Run("cache-control header present", func(t *testing.T) {
		resp := app.GET(t, "/public/by-domain/"+hostname+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		assert.Equal(t, "public, max-age=60", resp.Header.Get("Cache-Control"))
	})

	t.Run("etag stable without changes", func(t *testing.T) {
		first := app.GET(t, "/public/by-domain/"+hostname+"/config", "")
		testutil.AssertStatus(t, first, http.StatusOK)
		etag1 := first.Header.Get("ETag")
		require.NotEmpty(t, etag1)

		second := app.GET(t, "/public/by-domain/"+hostname+"/config", "")
		testutil.AssertStatus(t, second, http.StatusOK)
		etag2 := second.Header.Get("ETag")
		assert.Equal(t, etag1, etag2)
	})

	t.Run("etag changes after branding update", func(t *testing.T) {
		before := app.GET(t, "/public/by-domain/"+hostname+"/config", "")
		testutil.AssertStatus(t, before, http.StatusOK)
		etagBefore := before.Header.Get("ETag")
		require.NotEmpty(t, etagBefore)

		brandingSvc := services.NewBrandingService(app.DB, app.Config)
		_, err := brandingSvc.UpdateBranding(context.Background(), storeIDParsed,
			models.StoreBranding{BrandName: "New Name For ETag Test"})
		require.NoError(t, err)

		after := app.GET(t, "/public/by-domain/"+hostname+"/config", "")
		testutil.AssertStatus(t, after, http.StatusOK)
		etagAfter := after.Header.Get("ETag")
		assert.NotEqual(t, etagBefore, etagAfter)
	})

	t.Run("304 when If-None-Match matches", func(t *testing.T) {
		first := app.GET(t, "/public/by-domain/"+hostname+"/config", "")
		testutil.AssertStatus(t, first, http.StatusOK)
		etag := first.Header.Get("ETag")
		require.NotEmpty(t, etag)

		resp := app.GETWithHeaders(t, "/public/by-domain/"+hostname+"/config", map[string]string{
			"If-None-Match": etag,
		})
		testutil.AssertStatus(t, resp, http.StatusNotModified)
	})

	// REQ-RESOLVE-05
	t.Run("suspended store returns 404", func(t *testing.T) {
		other, _, otherStoreID := app.CreateOtherOwner(t)
		_ = other
		otherStoreIDParsed := mustParseUUID(t, otherStoreID)
		otherHostname := fmt.Sprintf("suspended-%s.goshopping.com", otherStoreIDParsed)
		seedStoreDomain(t, app, otherStoreIDParsed, otherHostname, "active")

		if _, err := app.DB.Exec(context.Background(),
			"UPDATE stores SET status = 'suspended' WHERE id = $1", otherStoreIDParsed,
		); err != nil {
			t.Fatalf("suspend store: %v", err)
		}

		resp := app.GET(t, "/public/by-domain/"+otherHostname+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("inactive store returns 404", func(t *testing.T) {
		other, _, otherStoreID := app.CreateOtherOwner(t)
		_ = other
		otherStoreIDParsed := mustParseUUID(t, otherStoreID)
		otherHostname := fmt.Sprintf("inactive-%s.goshopping.com", otherStoreIDParsed)
		seedStoreDomain(t, app, otherStoreIDParsed, otherHostname, "active")

		if _, err := app.DB.Exec(context.Background(),
			"UPDATE stores SET status = 'inactive' WHERE id = $1", otherStoreIDParsed,
		); err != nil {
			t.Fatalf("deactivate store: %v", err)
		}

		resp := app.GET(t, "/public/by-domain/"+otherHostname+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("active store returns 200 with full config", func(t *testing.T) {
		resp := app.GET(t, "/public/by-domain/"+hostname+"/config", "")
		testutil.AssertStatus(t, resp, http.StatusOK)
		data := testutil.AssertJSON(t, resp)
		assert.Equal(t, slug, data["slug"])
		assert.Equal(t, "active", data["status"])
		_, hasBranding := data["branding"]
		assert.True(t, hasBranding)
	})
}

func upper(s string) string {
	out := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'a' && c <= 'z' {
			c -= 'a' - 'A'
		}
		out[i] = c
	}
	return string(out)
}

func keys(m map[string]interface{}) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}
