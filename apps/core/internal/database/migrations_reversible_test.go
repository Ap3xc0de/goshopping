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
	if err := m.Steps(-1); err != nil {
		t.Fatalf("down step for 008 failed: %v", err)
	}
	if columnExists(t, db, "stores", "template_id") {
		t.Fatal("down_008_drops_column: expected stores.template_id to be gone after down 008")
	}

	// down_007_drops_table
	if err := m.Steps(-1); err != nil {
		t.Fatalf("down step for 007 failed: %v", err)
	}
	if tableExists(t, db, "store_domains") {
		t.Fatal("down_007_drops_table: expected store_domains to be gone after down 007")
	}
}
