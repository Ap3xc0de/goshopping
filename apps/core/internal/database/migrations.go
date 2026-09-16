package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/goshopping/core/internal/config"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// resolveMigrationsDir locates the migrations/ directory by walking up from the
// working directory.
//
// The previous "file://migrations" literal resolved against the process working
// directory, so it only worked when the binary was started from apps/core. Under
// `go test` each package runs with its own source directory as the working
// directory, which is why every test that reached this function from
// internal/services failed with `open .: file does not exist`.
func resolveMigrationsDir() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to read working directory: %w", err)
	}

	start := dir
	for {
		candidate := filepath.Join(dir, "migrations")
		if info, statErr := os.Stat(candidate); statErr == nil && info.IsDir() {
			return candidate, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("no migrations directory found from %s upwards", start)
		}
		dir = parent
	}
}

// RunMigrations executes all pending up migrations from the migrations/ directory.
func RunMigrations(cfg *config.Config) {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("migrations: failed to open db connection: %v", err)
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("migrations: failed to create driver: %v", err)
	}

	migrationsDir, err := resolveMigrationsDir()
	if err != nil {
		log.Fatalf("migrations: %v", err)
	}

	// iofs + os.DirFS instead of a "file://" URL: on Windows an absolute path
	// such as C:\... parses with "C:" as the URL host and the source driver
	// fails to open it.
	src, err := iofs.New(os.DirFS(migrationsDir), ".")
	if err != nil {
		log.Fatalf("migrations: failed to open migrations dir %s: %v", migrationsDir, err)
	}

	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		log.Fatalf("migrations: failed to initialise migrate: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("migrations: failed to run up migrations: %v", err)
	}

	backfillStoreDomains(db, cfg)

	log.Println("migrations: all up-to-date")
}

// backfillStoreDomains ensures every store has a generic store_domains row,
// deriving the hostname from its slug and cfg.StorefrontBaseDomain.
//
// This intentionally lives in Go, not in 007_store_domains.up.sql: the base
// domain is an environment value (goshopping.com in production,
// staging.goshopping.com in staging), and a versioned .sql migration file
// cannot know which environment it will run against. Running it on every
// boot (guarded by ON CONFLICT DO NOTHING on the UNIQUE hostname constraint)
// keeps it idempotent and covers stores created before store_domains existed
// as well as any that otherwise ended up without a generic domain.
func backfillStoreDomains(db *sql.DB, cfg *config.Config) {
	baseDomain := cfg.StorefrontBaseDomain
	if baseDomain == "" {
		baseDomain = "goshopping.com"
	}

	_, err := db.Exec(`
		INSERT INTO store_domains (store_id, hostname, kind, status, is_primary)
		SELECT id, slug || '.' || $1, 'generic', 'active', true
		FROM stores
		ON CONFLICT (hostname) DO NOTHING`,
		baseDomain,
	)
	if err != nil {
		log.Fatalf("migrations: failed to backfill store_domains: %v", err)
	}
}
