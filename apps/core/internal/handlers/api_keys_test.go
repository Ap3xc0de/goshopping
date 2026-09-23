package handlers_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var apiKeyPattern = regexp.MustCompile(`^gsk_[0-9a-f]{40}$`)

// rawAndJSON reads the whole body once and returns both the decoded map and
// the raw string, so tests can assert structural facts and "string never
// appears" facts from the same response.
func rawAndJSON(t *testing.T, resp *http.Response) (map[string]interface{}, string) {
	t.Helper()
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	require.NoError(t, err, "read response body")

	var m map[string]interface{}
	require.NoError(t, json.Unmarshal(b, &m), "parse JSON from body: %s", string(b))
	return m, string(b)
}

// jsonArray decodes a JSON array body into []map[string]interface{}.
func jsonArray(t *testing.T, resp *http.Response) []map[string]interface{} {
	t.Helper()
	defer resp.Body.Close()
	var rows []map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&rows), "parse JSON array")
	return rows
}

// TestCreateAPIKey covers the Create Store API Key requirement: the owner gets
// the plaintext exactly once, the row persists only hash+prefix+active, and
// invalid names are rejected with nothing persisted.
func TestCreateAPIKey(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeIDStr := app.OwnerAuthHeader(t)

	t.Run("creates a key and returns the plaintext exactly once", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeIDStr+"/api-keys", map[string]interface{}{"name": "Mobile app"}, auth)
		testutil.AssertStatus(t, resp, http.StatusOK)

		body, raw := rawAndJSON(t, resp)
		assert.NotContains(t, raw, "key_hash", "key_hash must never leave the server")

		apiKey, ok := body["api_key"].(map[string]interface{})
		require.True(t, ok, "response should carry api_key")
		plain, ok := body["plaintext"].(string)
		require.True(t, ok, "response should carry the plaintext")
		assert.Regexp(t, apiKeyPattern, plain)

		assert.Equal(t, plain[:12], apiKey["prefix"])
		assert.Equal(t, true, apiKey["active"])
		assert.Equal(t, 1, strings.Count(raw, plain),
			"the plaintext must appear exactly once in the raw response")
	})

	t.Run("empty and 101-char names are rejected with 400 and nothing persisted", func(t *testing.T) {
		for _, bad := range []string{"", "   ", strings.Repeat("n", 101)} {
			resp := app.POST(t, "/stores/"+storeIDStr+"/api-keys", map[string]interface{}{"name": bad}, auth)
			testutil.AssertStatus(t, resp, http.StatusBadRequest)
		}

		resp := app.GET(t, "/stores/"+storeIDStr+"/api-keys", auth)
		list := jsonArray(t, resp)
		require.NotEmpty(t, list, "earlier successful creates should still be listed")
		for _, row := range list {
			name, _ := row["name"].(string)
			assert.NotEqual(t, strings.Repeat("n", 101), name)
			assert.NotEqual(t, "", name)
		}
	})

	t.Run("requires auth", func(t *testing.T) {
		resp := app.POST(t, "/stores/"+storeIDStr+"/api-keys", map[string]interface{}{"name": "No auth"}, "")
		testutil.AssertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("another owner cannot create keys for this store", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.POST(t, "/stores/"+storeIDStr+"/api-keys", map[string]interface{}{"name": "Intruder"}, otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})
}

// TestListAPIKeys covers the masked list requirement: every row exposes
// metadata but never key_hash or any plaintext.
func TestListAPIKeys(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeIDStr := app.OwnerAuthHeader(t)
	storeID := mustParseUUID(t, storeIDStr)

	_, plain := testutil.CreateTestAPIKey(t, app.DB, storeID, "Listed key")
	testutil.CreateTestAPIKey(t, app.DB, storeID, "Second key")

	t.Run("lists masked rows without key_hash and without plaintext", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeIDStr+"/api-keys", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)

		rows := jsonArray(t, resp)
		require.Len(t, rows, 2)
		for _, row := range rows {
			assert.NotContains(t, row, "key_hash")
			assert.NotContains(t, row, "plaintext")
			assert.Contains(t, row, "id")
			assert.Contains(t, row, "name")
			assert.Contains(t, row, "prefix")
			assert.Contains(t, row, "active")
		}
	})

	t.Run("raw list body never contains the plaintext", func(t *testing.T) {
		resp := app.GET(t, "/stores/"+storeIDStr+"/api-keys", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)

		// Re-request to read the raw body afresh.
		defer resp.Body.Close()
		b, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.NotContains(t, string(b), plain, "plaintext must never appear in the list")
	})
}

// TestRevokeAPIKey covers the revoke requirement plus store-scoped isolation:
// DELETE sets revoked_at, a second DELETE 404s, and a keyId from another store
// can never be revoked.
func TestRevokeAPIKey(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeIDStr := app.OwnerAuthHeader(t)
	storeID := mustParseUUID(t, storeIDStr)

	key, _ := testutil.CreateTestAPIKey(t, app.DB, storeID, "Doomed key")

	t.Run("revoke returns 204 and marks the key revoked", func(t *testing.T) {
		resp := app.DELETE(t, "/stores/"+storeIDStr+"/api-keys/"+key.ID.String(), auth)
		testutil.AssertStatus(t, resp, http.StatusNoContent)

		var active bool
		var revokedAt interface{}
		err := app.DB.QueryRow(context.Background(),
			`SELECT active, revoked_at FROM store_api_keys WHERE id = $1`, key.ID,
		).Scan(&active, &revokedAt)
		require.NoError(t, err)
		assert.False(t, active)
		assert.NotNil(t, revokedAt)
	})

	t.Run("revoking again returns 404", func(t *testing.T) {
		resp := app.DELETE(t, "/stores/"+storeIDStr+"/api-keys/"+key.ID.String(), auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("unknown keyId returns 404", func(t *testing.T) {
		resp := app.DELETE(t, "/stores/"+storeIDStr+"/api-keys/00000000-0000-0000-0000-000000000001", auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("another store's owner cannot revoke this key", func(t *testing.T) {
		otherAuth, _, _ := app.CreateOtherOwner(t)
		resp := app.DELETE(t, "/stores/"+storeIDStr+"/api-keys/"+key.ID.String(), otherAuth)
		testutil.AssertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("a keyId from another store returns 404 and leaves the key intact", func(t *testing.T) {
		_, _, otherStoreStr := app.OwnerAuthHeader(t)
		otherStore := mustParseUUID(t, otherStoreStr)
		foreignKey, _ := testutil.CreateTestAPIKey(t, app.DB, otherStore, "Foreign key")

		resp := app.DELETE(t, "/stores/"+storeIDStr+"/api-keys/"+foreignKey.ID.String(), auth)
		testutil.AssertStatus(t, resp, http.StatusNotFound)

		var active bool
		err := app.DB.QueryRow(context.Background(),
			`SELECT active FROM store_api_keys WHERE id = $1`, foreignKey.ID,
		).Scan(&active)
		require.NoError(t, err)
		assert.True(t, active, "the foreign store's key must remain untouched")
	})
}
