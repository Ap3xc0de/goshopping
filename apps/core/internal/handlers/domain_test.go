package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

// REQ-ADMIN-04: step 3 of the create-store wizard shows the store's generic
// hostname, so the tenant-scoped API has to expose it.
func TestGetStoreDomain(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	auth, _, storeID := app.OwnerAuthHeader(t)
	storeIDParsed := mustParseUUID(t, storeID)

	t.Run("returns the generic hostname", func(t *testing.T) {
		hostname := fmt.Sprintf("get-domain-%s.goshopping.com", storeIDParsed)
		if _, err := app.DB.Exec(context.Background(), `
			INSERT INTO store_domains (store_id, hostname, kind, status, is_primary)
			VALUES ($1, $2, 'generic', 'active', true)`,
			storeIDParsed, hostname,
		); err != nil {
			t.Fatalf("seed store_domains: %v", err)
		}

		resp := app.GET(t, "/stores/"+storeID+"/domain", auth)
		testutil.AssertStatus(t, resp, http.StatusOK)

		data := testutil.AssertJSON(t, resp)
		got, ok := data["hostname"]
		assert.True(t, ok, "response must carry a hostname key")
		assert.Equal(t, hostname, got)
		assert.Equal(t, "generic", data["kind"])
		assert.Equal(t, "active", data["status"])
	})

	t.Run("404 when the store has no domain yet", func(t *testing.T) {
		other, _, otherStoreID := app.CreateOtherOwner(t)
		resp := app.GET(t, "/stores/"+otherStoreID+"/domain", other)
		testutil.AssertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("cannot read another store's domain", func(t *testing.T) {
		victimID := uuid.New()
		hostname := fmt.Sprintf("victim-%s.goshopping.com", victimID)

		var accountID uuid.UUID
		ctx := context.Background()
		if err := app.DB.QueryRow(ctx, `
			INSERT INTO accounts (email, password_hash, name, role, status)
			VALUES ($1, 'x', 'Victim', 'owner', 'active')
			RETURNING id`,
			fmt.Sprintf("victim-%s@example.test", victimID),
		).Scan(&accountID); err != nil {
			t.Fatalf("insert victim account: %v", err)
		}
		if _, err := app.DB.Exec(ctx, `
			INSERT INTO stores (id, account_id, name, slug, status)
			VALUES ($1, $2, 'Victim Store', $3, 'active')`,
			victimID, accountID, fmt.Sprintf("victim-store-%s", victimID),
		); err != nil {
			t.Fatalf("insert victim store: %v", err)
		}
		if _, err := app.DB.Exec(ctx, `
			INSERT INTO store_domains (store_id, hostname, kind, status, is_primary)
			VALUES ($1, $2, 'generic', 'active', true)`,
			victimID, hostname,
		); err != nil {
			t.Fatalf("seed victim domain: %v", err)
		}

		// auth belongs to the first store, not the victim's.
		resp := app.GET(t, "/stores/"+victimID.String()+"/domain", auth)
		assert.NotEqual(t, http.StatusOK, resp.StatusCode,
			"an owner must not read another store's hostname")
	})
}
