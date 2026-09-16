package database_test

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/database"
	"github.com/jackc/pgx/v5/pgxpool"
)

// testConfig builds a *config.Config pointed at the local test database from
// the same env vars used by internal/services tests (DB_HOST, DB_PORT, ...).
// Skips the test if DB_HOST is not set, matching internal/services convention.
func testConfig(t *testing.T) *config.Config {
	t.Helper()

	cfg := &config.Config{
		DBHost:     os.Getenv("DB_HOST"),
		DBPort:     os.Getenv("DB_PORT"),
		DBUser:     os.Getenv("DB_USER"),
		DBPassword: os.Getenv("DB_PASSWORD"),
		DBName:     os.Getenv("DB_NAME"),
		DBSSLMode:  "disable",
	}

	if cfg.DBHost == "" {
		t.Skip("DB_HOST env var not set, skipping integration test")
	}

	return cfg
}

// setupSchemaTestDB runs migrations to HEAD and returns a live pool.
func setupSchemaTestDB(t *testing.T) (*pgxpool.Pool, *config.Config) {
	t.Helper()

	cfg := testConfig(t)
	database.RunMigrations(cfg)
	db := database.Connect(cfg)
	t.Cleanup(db.Close)

	return db, cfg
}

// createTestStore inserts a real account + store pair and returns the store ID.
// store_domains.store_id is a foreign key into stores, so tests need a real
// parent row, not a random UUID.
func createTestStore(t *testing.T, db *pgxpool.Pool) uuid.UUID {
	t.Helper()
	ctx := context.Background()

	storeID := uuid.New()

	var accountID uuid.UUID
	if err := db.QueryRow(ctx, `
		INSERT INTO accounts (email, password_hash, name, role, status)
		VALUES ($1, 'x', 'Store Domain Test Account', 'owner', 'active')
		RETURNING id`,
		fmt.Sprintf("store-domain-test-%s@example.test", storeID),
	).Scan(&accountID); err != nil {
		t.Fatalf("createTestStore: insert account: %v", err)
	}

	if _, err := db.Exec(ctx, `
		INSERT INTO stores (id, account_id, name, slug, status)
		VALUES ($1, $2, 'Test Store', $3, 'active')`,
		storeID, accountID, fmt.Sprintf("test-store-%s", storeID),
	); err != nil {
		t.Fatalf("createTestStore: insert store: %v", err)
	}

	return storeID
}

// ── REQ-DOMAIN-01 ────────────────────────────────────────────────────────────

func TestStoreDomainsInsertValidGeneric(t *testing.T) {
	db, _ := setupSchemaTestDB(t)
	storeID := createTestStore(t, db)
	ctx := context.Background()

	hostname := fmt.Sprintf("tienda-%s.goshopping.com", storeID)

	var id uuid.UUID
	var updatedAtSet bool
	err := db.QueryRow(ctx, `
		INSERT INTO store_domains (store_id, hostname, kind, status)
		VALUES ($1, $2, 'generic', 'active')
		RETURNING id, updated_at IS NOT NULL`,
		storeID, hostname,
	).Scan(&id, &updatedAtSet)
	if err != nil {
		t.Fatalf("expected valid insert to succeed, got error: %v", err)
	}
	if id == uuid.Nil {
		t.Fatal("expected a generated UUID for the new row")
	}
	if !updatedAtSet {
		t.Fatal("expected updated_at to be set by DEFAULT NOW()")
	}
}

func TestStoreDomainsKindCheckRejectsInvalid(t *testing.T) {
	db, _ := setupSchemaTestDB(t)
	storeID := createTestStore(t, db)
	ctx := context.Background()

	hostname := fmt.Sprintf("kind-invalid-%s.goshopping.com", storeID)

	_, err := db.Exec(ctx, `
		INSERT INTO store_domains (store_id, hostname, kind, status)
		VALUES ($1, $2, 'invalid', 'active')`,
		storeID, hostname,
	)
	if err == nil {
		t.Fatal("expected INSERT with kind='invalid' to fail the CHECK constraint")
	}
	if !strings.Contains(err.Error(), "check constraint") {
		t.Fatalf("expected a check constraint violation, got: %v", err)
	}
}

func TestStoreDomainsStatusCheckRejectsInvalid(t *testing.T) {
	db, _ := setupSchemaTestDB(t)
	storeID := createTestStore(t, db)
	ctx := context.Background()

	hostname := fmt.Sprintf("status-invalid-%s.goshopping.com", storeID)

	_, err := db.Exec(ctx, `
		INSERT INTO store_domains (store_id, hostname, kind, status)
		VALUES ($1, $2, 'generic', 'unknown')`,
		storeID, hostname,
	)
	if err == nil {
		t.Fatal("expected INSERT with status='unknown' to fail the CHECK constraint")
	}
	if !strings.Contains(err.Error(), "check constraint") {
		t.Fatalf("expected a check constraint violation, got: %v", err)
	}
}

func TestStoreDomainsCascadeDeleteOnStoreDelete(t *testing.T) {
	db, _ := setupSchemaTestDB(t)
	storeID := createTestStore(t, db)
	ctx := context.Background()

	hostname := fmt.Sprintf("cascade-%s.goshopping.com", storeID)
	if _, err := db.Exec(ctx, `
		INSERT INTO store_domains (store_id, hostname, kind, status)
		VALUES ($1, $2, 'generic', 'active')`,
		storeID, hostname,
	); err != nil {
		t.Fatalf("setup insert failed: %v", err)
	}

	if _, err := db.Exec(ctx, `DELETE FROM stores WHERE id = $1`, storeID); err != nil {
		t.Fatalf("failed to delete parent store: %v", err)
	}

	var count int
	if err := db.QueryRow(ctx, `SELECT COUNT(*) FROM store_domains WHERE store_id = $1`, storeID).Scan(&count); err != nil {
		t.Fatalf("failed to count store_domains: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected store_domains rows to cascade-delete with parent store, found %d", count)
	}
}

func TestStoreDomainsHostnameUnique(t *testing.T) {
	db, _ := setupSchemaTestDB(t)
	storeA := createTestStore(t, db)
	storeB := createTestStore(t, db)
	ctx := context.Background()

	hostname := fmt.Sprintf("shared-%s.goshopping.com", storeA)

	if _, err := db.Exec(ctx, `
		INSERT INTO store_domains (store_id, hostname, kind, status)
		VALUES ($1, $2, 'generic', 'active')`,
		storeA, hostname,
	); err != nil {
		t.Fatalf("first insert should succeed: %v", err)
	}

	_, err := db.Exec(ctx, `
		INSERT INTO store_domains (store_id, hostname, kind, status)
		VALUES ($1, $2, 'generic', 'active')`,
		storeB, hostname,
	)
	if err == nil {
		t.Fatal("expected second INSERT with the same hostname to fail the UNIQUE constraint")
	}
	if !strings.Contains(err.Error(), "unique constraint") {
		t.Fatalf("expected a unique constraint violation, got: %v", err)
	}
}
