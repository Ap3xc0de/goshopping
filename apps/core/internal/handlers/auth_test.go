package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
)

// registerOwner posts to /auth/register and returns the lowercased email used,
// so callers can look the account up afterwards.
func registerOwner(t *testing.T, app *testutil.TestApp, name string) string {
	t.Helper()

	email := strings.ToLower(fmt.Sprintf("register-%s@example.test", uuid.New()))
	resp := app.POST(t, "/auth/register", map[string]interface{}{
		"email":    email,
		"password": "SuperSecret123",
		"name":     name,
	}, "")
	testutil.AssertStatus(t, resp, http.StatusCreated)
	return email
}

// storeOf returns the id and slug of the store auto-provisioned for an email.
func storeOf(t *testing.T, app *testutil.TestApp, email string) (uuid.UUID, string) {
	t.Helper()

	var storeID uuid.UUID
	var slug string
	if err := app.DB.QueryRow(context.Background(), `
		SELECT s.id, s.slug
		FROM stores s
		JOIN accounts a ON a.id = s.account_id
		WHERE a.email = $1`, email,
	).Scan(&storeID, &slug); err != nil {
		t.Fatalf("store for %s not found: %v", email, err)
	}
	return storeID, slug
}

// REQ-DOMAIN-06: registering provisions the store's generic hostname.
func TestRegisterCreatesGenericDomain(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	email := registerOwner(t, app, "Domain Tester")
	storeID, slug := storeOf(t, app, email)

	var hostname, kind, status string
	var isPrimary bool
	if err := app.DB.QueryRow(context.Background(), `
		SELECT hostname, kind, status, is_primary
		FROM store_domains
		WHERE store_id = $1`, storeID,
	).Scan(&hostname, &kind, &status, &isPrimary); err != nil {
		t.Fatalf("no store_domains row was created for the new store: %v", err)
	}

	assert.Equal(t, slug+"."+app.Config.StorefrontBaseDomain, hostname,
		"the generic hostname must be derived from the store slug")
	assert.Equal(t, "generic", kind)
	assert.Equal(t, "active", status)
	assert.True(t, isPrimary, "the generic domain is the store's canonical hostname")
}

// REQ-DOMAIN-05: exactly one generic row per store, so the canonical hostname
// is never ambiguous. Guards against the boot backfill inserting a duplicate
// alongside the one Register already created.
func TestRegisterCreatesExactlyOneDomain(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	email := registerOwner(t, app, "Single Domain Tester")
	storeID, _ := storeOf(t, app, email)

	var count int
	if err := app.DB.QueryRow(context.Background(),
		`SELECT count(*) FROM store_domains WHERE store_id = $1`, storeID,
	).Scan(&count); err != nil {
		t.Fatalf("count store_domains: %v", err)
	}
	assert.Equal(t, 1, count, "a freshly registered store must have exactly one domain")
}

// The account, store, store_users link and store_domains row are written in a
// single transaction, so a caller that sees 201 can rely on all four existing.
func TestRegisterProvisionsStoreAtomically(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	email := registerOwner(t, app, "Atomic Tester")
	storeID, _ := storeOf(t, app, email)

	var links, domains int
	ctx := context.Background()
	if err := app.DB.QueryRow(ctx,
		`SELECT count(*) FROM store_users WHERE store_id = $1`, storeID,
	).Scan(&links); err != nil {
		t.Fatalf("count store_users: %v", err)
	}
	if err := app.DB.QueryRow(ctx,
		`SELECT count(*) FROM store_domains WHERE store_id = $1`, storeID,
	).Scan(&domains); err != nil {
		t.Fatalf("count store_domains: %v", err)
	}

	assert.Equal(t, 1, links, "the owner must be linked to the store")
	assert.Equal(t, 1, domains, "the store must have its generic domain")
}
