package database_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/database"
)

// REQ-DOMAIN-03: backfill_count_matches / backfill_hostname_derived_from_slug /
// backfill_is_idempotent.
//
// database.RunMigrations backfills a generic store_domains row for every
// store that does not already have one, deriving the hostname from
// cfg.StorefrontBaseDomain. It must be safe to call on every boot without
// creating duplicates.
func TestBackfillStoreDomainsIsIdempotent(t *testing.T) {
	cfg := testConfig(t)
	cfg.StorefrontBaseDomain = "backfill-test.example.com"

	// Ensure schema is at HEAD before poking at raw tables.
	database.RunMigrations(cfg)

	db := database.Connect(cfg)
	t.Cleanup(db.Close)
	ctx := context.Background()

	accountID := uuid.New()
	if _, err := db.Exec(ctx, `
		INSERT INTO accounts (id, email, password_hash, name, role, status)
		VALUES ($1, $2, 'x', 'Backfill Test Account', 'owner', 'active')`,
		accountID, fmt.Sprintf("backfill-test-%s@example.test", accountID),
	); err != nil {
		t.Fatalf("insert account: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(context.Background(), `DELETE FROM accounts WHERE id = $1`, accountID)
	})

	slugs := []string{
		fmt.Sprintf("backfill-a-%s", accountID),
		fmt.Sprintf("backfill-b-%s", accountID),
	}
	storeIDs := make([]uuid.UUID, len(slugs))

	for i, slug := range slugs {
		id := uuid.New()
		// Insert the store directly, bypassing any application-level domain
		// creation — this simulates a store that predates store_domains and
		// depends entirely on the backfill to get a generic hostname.
		if _, err := db.Exec(ctx, `
			INSERT INTO stores (id, account_id, name, slug, status)
			VALUES ($1, $2, 'Backfill Test Store', $3, 'active')`,
			id, accountID, slug,
		); err != nil {
			t.Fatalf("insert store %s: %v", slug, err)
		}
		storeIDs[i] = id
	}

	countDomainsFor := func() int {
		var count int
		if err := db.QueryRow(ctx, `
			SELECT COUNT(*) FROM store_domains WHERE store_id = ANY($1)`,
			storeIDs,
		).Scan(&count); err != nil {
			t.Fatalf("count store_domains: %v", err)
		}
		return count
	}

	// Running migrations again (as every app boot does) must backfill the
	// two stores created above with exactly one generic domain each.
	database.RunMigrations(cfg)

	if got := countDomainsFor(); got != len(storeIDs) {
		t.Fatalf("backfill_count_matches: expected %d store_domains rows, got %d", len(storeIDs), got)
	}

	for i, slug := range slugs {
		var hostname, kind, status string
		var isPrimary bool
		if err := db.QueryRow(ctx, `
			SELECT hostname, kind, status, is_primary FROM store_domains WHERE store_id = $1`,
			storeIDs[i],
		).Scan(&hostname, &kind, &status, &isPrimary); err != nil {
			t.Fatalf("select backfilled domain for %s: %v", slug, err)
		}

		expectedHostname := slug + ".backfill-test.example.com"
		if hostname != expectedHostname {
			t.Fatalf("backfill_hostname_derived_from_slug: expected hostname %q, got %q", expectedHostname, hostname)
		}
		if kind != "generic" {
			t.Fatalf("expected kind 'generic', got %q", kind)
		}
		if status != "active" {
			t.Fatalf("expected status 'active', got %q", status)
		}
		if !isPrimary {
			t.Fatal("expected is_primary to be true for the backfilled domain")
		}
	}

	// backfill_is_idempotent: running RunMigrations again must not duplicate rows.
	database.RunMigrations(cfg)
	database.RunMigrations(cfg)

	if got := countDomainsFor(); got != len(storeIDs) {
		t.Fatalf("backfill_is_idempotent: expected count to stay at %d after re-running migrations, got %d", len(storeIDs), got)
	}
}
