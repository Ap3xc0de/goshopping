package services_test

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var keyPattern = regexp.MustCompile(`^gsk_[0-9a-f]{40}$`)

func mustUUID(t *testing.T, s string) uuid.UUID {
	t.Helper()
	id, err := uuid.Parse(s)
	require.NoError(t, err)
	return id
}

// setupAPIKeyService wires a full test app and returns the service plus two
// stores (with slugs) so store-isolation paths can be exercised.
func setupAPIKeyService(t *testing.T) (*testutil.TestApp, *services.APIKeyService, uuid.UUID, string, uuid.UUID, string) {
	t.Helper()
	app := testutil.SetupTestApp(t)
	t.Cleanup(app.Cleanup)
	svc := services.NewAPIKeyService(app.DB)

	_, _, storeIDStr := app.OwnerAuthHeader(t)
	storeID := mustUUID(t, storeIDStr)
	slug := testutil.GetStoreSlug(t, app.DB, storeID)

	_, _, otherIDStr := app.OwnerAuthHeader(t)
	otherID := mustUUID(t, otherIDStr)
	otherSlug := testutil.GetStoreSlug(t, app.DB, otherID)

	return app, svc, storeID, slug, otherID, otherSlug
}

func TestAPIKeyServiceCreate(t *testing.T) {
	app, svc, storeID, _, _, _ := setupAPIKeyService(t)

	t.Run("returns a plaintext gsk_ key once and persists hash and prefix", func(t *testing.T) {
		plaintext, key, err := svc.Create(context.Background(), storeID, "Production app")
		require.NoError(t, err)

		assert.Regexp(t, keyPattern, plaintext)
		assert.Equal(t, plaintext[:12], key.Prefix)
		assert.Equal(t, models.HashKey(plaintext), key.KeyHash)
		assert.True(t, key.Active)

		var dbHash string
		var dbActive bool
		err = app.DB.QueryRow(context.Background(),
			`SELECT key_hash, active FROM store_api_keys WHERE id = $1`, key.ID,
		).Scan(&dbHash, &dbActive)
		require.NoError(t, err)
		assert.Equal(t, models.HashKey(plaintext), dbHash)
		assert.True(t, dbActive)
	})

	t.Run("trims and persists the trimmed name", func(t *testing.T) {
		_, key, err := svc.Create(context.Background(), storeID, "  Mobile App  ")
		require.NoError(t, err)
		assert.Equal(t, "Mobile App", key.Name)
	})

	t.Run("rejects a whitespace-only name and persists nothing", func(t *testing.T) {
		before, err := svc.List(context.Background(), storeID)
		require.NoError(t, err)

		_, _, err = svc.Create(context.Background(), storeID, "   ")
		require.Error(t, err)

		after, err := svc.List(context.Background(), storeID)
		require.NoError(t, err)
		assert.Len(t, after, len(before), "no new row must be persisted on a rejected create")
	})

	t.Run("rejects a 101-char name", func(t *testing.T) {
		_, _, err := svc.Create(context.Background(), storeID, strings.Repeat("n", 101))
		require.Error(t, err)
	})
}

func TestAPIKeyServiceList(t *testing.T) {
	_, svc, storeID, _, otherID, _ := setupAPIKeyService(t)

	plainA, _, err := svc.Create(context.Background(), storeID, "Key A")
	require.NoError(t, err)
	plainB, _, err := svc.Create(context.Background(), storeID, "Key B")
	require.NoError(t, err)

	t.Run("returns all keys for the store", func(t *testing.T) {
		keys, err := svc.List(context.Background(), storeID)
		require.NoError(t, err)
		require.Len(t, keys, 2)

		names := map[string]bool{}
		for _, k := range keys {
			names[k.Name] = true
		}
		assert.True(t, names["Key A"])
		assert.True(t, names["Key B"])
	})

	t.Run("serialized rows expose metadata but never key_hash or the plaintexts", func(t *testing.T) {
		keys, err := svc.List(context.Background(), storeID)
		require.NoError(t, err)

		body, err := json.Marshal(keys)
		require.NoError(t, err)
		s := string(body)
		assert.NotContains(t, s, "key_hash")
		assert.NotContains(t, s, plainA, "plaintext must never be serialized")
		assert.NotContains(t, s, plainB, "plaintext must never be serialized")

		var rows []map[string]any
		require.NoError(t, json.Unmarshal(body, &rows))
		require.Len(t, rows, 2)
		for _, row := range rows {
			assert.Contains(t, row, "id")
			assert.Contains(t, row, "name")
			assert.Contains(t, row, "prefix")
			assert.NotContains(t, row, "plaintext")
		}
	})

	t.Run("only the store's own keys are listed", func(t *testing.T) {
		keys, err := svc.List(context.Background(), otherID)
		require.NoError(t, err)
		assert.Empty(t, keys)
	})
}

func TestAPIKeyServiceRevoke(t *testing.T) {
	app, svc, storeID, _, otherID, _ := setupAPIKeyService(t)

	_, key, err := svc.Create(context.Background(), storeID, "Doomed key")
	require.NoError(t, err)

	t.Run("sets revoked_at and active=false", func(t *testing.T) {
		err := svc.Revoke(context.Background(), storeID, key.ID)
		require.NoError(t, err)

		var revokedAt *string
		var active bool
		err = app.DB.QueryRow(context.Background(),
			`SELECT revoked_at::text, active FROM store_api_keys WHERE id = $1`, key.ID,
		).Scan(&revokedAt, &active)
		require.NoError(t, err)
		assert.False(t, active)
		if revokedAt == nil {
			t.Fatal("revoked_at should be set after revoke")
		}
	})

	t.Run("revoking again returns ErrAPIKeyNotFound", func(t *testing.T) {
		err := svc.Revoke(context.Background(), storeID, key.ID)
		assert.ErrorIs(t, err, services.ErrAPIKeyNotFound)
	})

	t.Run("revoking an unknown id returns ErrAPIKeyNotFound", func(t *testing.T) {
		err := svc.Revoke(context.Background(), storeID, uuid.New())
		assert.ErrorIs(t, err, services.ErrAPIKeyNotFound)
	})

	t.Run("revoking another store's key returns ErrAPIKeyNotFound", func(t *testing.T) {
		err := svc.Revoke(context.Background(), otherID, key.ID)
		assert.ErrorIs(t, err, services.ErrAPIKeyNotFound)
	})
}

func TestAPIKeyServiceValidateToken(t *testing.T) {
	app, svc, storeID, slug, _, otherSlug := setupAPIKeyService(t)

	plaintext, key, err := svc.Create(context.Background(), storeID, "Valid key")
	require.NoError(t, err)

	t.Run("valid token bound to its own slug returns the key", func(t *testing.T) {
		got, err := svc.ValidateToken(context.Background(), plaintext, slug)
		require.NoError(t, err)
		assert.Equal(t, key.ID, got.ID)
		assert.Equal(t, storeID, got.StoreID)
	})

	t.Run("unknown token returns ErrAPIKeyInvalid", func(t *testing.T) {
		_, err := svc.ValidateToken(context.Background(), plaintext+"x", slug)
		assert.ErrorIs(t, err, services.ErrAPIKeyInvalid)
	})

	t.Run("revoked key returns ErrAPIKeyInvalid", func(t *testing.T) {
		plain, key, err := svc.Create(context.Background(), storeID, "Revoked key")
		require.NoError(t, err)
		err = svc.Revoke(context.Background(), storeID, key.ID)
		require.NoError(t, err)

		_, err = svc.ValidateToken(context.Background(), plain, slug)
		assert.ErrorIs(t, err, services.ErrAPIKeyInvalid)
	})

	t.Run("expired key returns ErrAPIKeyInvalid", func(t *testing.T) {
		plain, key, err := svc.Create(context.Background(), storeID, "Expiring key")
		require.NoError(t, err)
		_, err = app.DB.Exec(context.Background(),
			`UPDATE store_api_keys SET expires_at = NOW() - interval '1 hour' WHERE id = $1`, key.ID)
		require.NoError(t, err)

		_, err = svc.ValidateToken(context.Background(), plain, slug)
		assert.ErrorIs(t, err, services.ErrAPIKeyInvalid)
	})

	t.Run("inactive key returns ErrAPIKeyInvalid", func(t *testing.T) {
		plain, key, err := svc.Create(context.Background(), storeID, "Disabled key")
		require.NoError(t, err)
		_, err = app.DB.Exec(context.Background(),
			`UPDATE store_api_keys SET active = false WHERE id = $1`, key.ID)
		require.NoError(t, err)

		_, err = svc.ValidateToken(context.Background(), plain, slug)
		assert.ErrorIs(t, err, services.ErrAPIKeyInvalid)
	})

	t.Run("key validated against another store's slug returns ErrAPIKeyStoreMismatch", func(t *testing.T) {
		plain, _, err := svc.Create(context.Background(), storeID, "Cross-store key")
		require.NoError(t, err)

		_, err = svc.ValidateToken(context.Background(), plain, otherSlug)
		assert.ErrorIs(t, err, services.ErrAPIKeyStoreMismatch)
	})

	t.Run("typed errors are distinct", func(t *testing.T) {
		assert.False(t, errors.Is(services.ErrAPIKeyInvalid, services.ErrAPIKeyStoreMismatch))
		assert.False(t, errors.Is(services.ErrAPIKeyNotFound, services.ErrAPIKeyInvalid))
	})
}
