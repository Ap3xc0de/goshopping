package database_test

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/database"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// openTestMigrate builds a *migrate.Migrate against the real migrations/
// directory, mirroring database.RunMigrations's own setup (iofs + os.DirFS,
// not a "file://" URL, so it also works with Windows absolute paths).
func openTestMigrate(t *testing.T, cfg *config.Config) (*migrate.Migrate, *sql.DB) {
	t.Helper()

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("openTestMigrate: open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		t.Fatalf("openTestMigrate: driver: %v", err)
	}

	// Test binaries run with the package directory as CWD, so the migrations
	// dir is two levels up from internal/database.
	migrationsDir := "../../migrations"
	if _, statErr := os.Stat(migrationsDir); statErr != nil {
		t.Fatalf("openTestMigrate: migrations dir not found at %s: %v", migrationsDir, statErr)
	}

	src, err := iofs.New(os.DirFS(migrationsDir), ".")
	if err != nil {
		t.Fatalf("openTestMigrate: iofs: %v", err)
	}

	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		t.Fatalf("openTestMigrate: migrate instance: %v", err)
	}

	return m, db
}

func tableExists(t *testing.T, db *sql.DB, table string) bool {
	t.Helper()
	var exists bool
	err := db.QueryRow(`SELECT EXISTS (
		SELECT 1 FROM information_schema.tables WHERE table_name = $1
	)`, table).Scan(&exists)
	if err != nil {
		t.Fatalf("tableExists(%s): %v", table, err)
	}
	return exists
}

func columnExists(t *testing.T, db *sql.DB, table, column string) bool {
	t.Helper()
	var exists bool
	err := db.QueryRow(`SELECT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2
	)`, table, column).Scan(&exists)
	if err != nil {
		t.Fatalf("columnExists(%s.%s): %v", table, column, err)
	}
	return exists
}

// down_011_drops_catalog — migration 011 must be fully reversible: stepping
// from HEAD (11) down to 10 drops every table/column/index/extension it
// created, and the cleanup below migrates straight back UP so the shared
// test database is always left at HEAD (same convention as the 007/008 test).
func TestMigrations011DownIsReversible(t *testing.T) {
	cfg := testConfig(t)

	// Ensure we start from HEAD (idempotent if already there).
	database.RunMigrations(cfg)

	m, db := openTestMigrate(t, cfg)

	// Always leave the schema back at HEAD for every other test/package,
	// regardless of pass/fail below.
	t.Cleanup(func() {
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			t.Fatalf("cleanup: failed to restore schema to HEAD: %v", err)
		}
	})

	for _, tbl := range []string{"categories", "product_variants", "shipping_zones", "shipping_methods", "newsletter_subscribers"} {
		if !tableExists(t, db, tbl) {
			t.Fatalf("expected %s to exist at HEAD (migration 011 applied)", tbl)
		}
	}
	if !columnExists(t, db, "products", "weight") || !columnExists(t, db, "products", "category_id") {
		t.Fatal("expected products.weight and products.category_id to exist at HEAD")
	}
	if !columnExists(t, db, "orders", "shipping_method") || !columnExists(t, db, "orders", "shipping_total") || !columnExists(t, db, "orders", "currency") {
		t.Fatal("expected orders.shipping_method/shipping_total/currency to exist at HEAD")
	}

	// down_011_drops_catalog: step to the absolute post-010 version so this
	// test always exercises 011's down script regardless of future HEAD.
	if err := m.Migrate(10); err != nil {
		t.Fatalf("migrate down to version 10 failed: %v", err)
	}

	for _, tbl := range []string{"categories", "product_variants", "shipping_zones", "shipping_methods", "newsletter_subscribers"} {
		if tableExists(t, db, tbl) {
			t.Fatalf("down_011_drops_catalog: expected %s to be gone after down 011", tbl)
		}
	}
	if columnExists(t, db, "products", "weight") {
		t.Fatal("down_011_drops_catalog: expected products.weight to be gone after down 011")
	}
	if columnExists(t, db, "products", "category_id") {
		t.Fatal("down_011_drops_catalog: expected products.category_id to be gone after down 011")
	}
	if columnExists(t, db, "orders", "shipping_method") || columnExists(t, db, "orders", "shipping_total") || columnExists(t, db, "orders", "currency") {
		t.Fatal("down_011_drops_catalog: expected orders shipping/currency columns to be gone after down 011")
	}
	// (Cleanup restores HEAD, re-applying 011.)
}

// REQ-DOMAIN-07: down_007_drops_table / down_008_drops_column.
//
// This test deliberately steps the schema DOWN and immediately back UP within
// the same test (never leaving the shared test database mid-migration for
// other packages that assume the schema is at HEAD).
func TestMigrations007And008DownAreReversible(t *testing.T) {
	cfg := testConfig(t)

	// Ensure we start from HEAD (idempotent if already there).
	database.RunMigrations(cfg)

	m, db := openTestMigrate(t, cfg)

	// Always leave the schema back at HEAD for every other test/package,
	// regardless of pass/fail below.
	t.Cleanup(func() {
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			t.Fatalf("cleanup: failed to restore schema to HEAD: %v", err)
		}
	})

	if !tableExists(t, db, "store_domains") {
		t.Fatal("expected store_domains to exist before testing down migrations")
	}
	if !columnExists(t, db, "stores", "template_id") {
		t.Fatal("expected stores.template_id to exist before testing down migrations")
	}

	// down_008_drops_column
	//
	// Migrate(7) targets the absolute post-007 version instead of a relative
	// Steps(-1): this test must keep exercising 007/008's down scripts
	// specifically, regardless of how many migrations exist above 008 at
	// HEAD (e.g. 009_orders_shipping_payment.up.sql) — Steps(-1) would have
	// undone whatever the newest migration is instead.
	if err := m.Migrate(7); err != nil {
		t.Fatalf("migrate down to version 7 failed: %v", err)
	}
	if columnExists(t, db, "stores", "template_id") {
		t.Fatal("down_008_drops_column: expected stores.template_id to be gone after down 008")
	}

	// down_007_drops_table
	if err := m.Migrate(6); err != nil {
		t.Fatalf("migrate down to version 6 failed: %v", err)
	}
	if tableExists(t, db, "store_domains") {
		t.Fatal("down_007_drops_table: expected store_domains to be gone after down 007")
	}
}
