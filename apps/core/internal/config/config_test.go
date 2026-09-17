package config_test

import (
	"os"
	"testing"

	"github.com/goshopping/core/internal/config"
)

// TestLoad_OriginSharedSecrets covers T1.3/T1.4: Config must load
// origin_shared_secret_current/previous the same way every other secret-backed
// field does — env var by default, enriched from AWS Secrets Manager only in
// staging/production (loadFromAWS). AppEnv defaults to "development" here, so
// these assertions exercise only the env-var path, exactly like the rest of
// config.go's fields are exercised without a real AWS account.
func TestLoad_OriginSharedSecrets(t *testing.T) {
	t.Run("defaults to empty when env vars are unset", func(t *testing.T) {
		os.Unsetenv("APP_ENV")
		os.Unsetenv("ORIGIN_SHARED_SECRET_CURRENT")
		os.Unsetenv("ORIGIN_SHARED_SECRET_PREVIOUS")

		cfg := config.Load()

		if cfg.OriginSharedSecretCurrent != "" {
			t.Errorf("OriginSharedSecretCurrent = %q, want empty", cfg.OriginSharedSecretCurrent)
		}
		if cfg.OriginSharedSecretPrevious != "" {
			t.Errorf("OriginSharedSecretPrevious = %q, want empty", cfg.OriginSharedSecretPrevious)
		}
	})

	t.Run("reads values from env vars", func(t *testing.T) {
		os.Unsetenv("APP_ENV")
		os.Setenv("ORIGIN_SHARED_SECRET_CURRENT", "dev-current")
		os.Setenv("ORIGIN_SHARED_SECRET_PREVIOUS", "dev-previous")
		defer os.Unsetenv("ORIGIN_SHARED_SECRET_CURRENT")
		defer os.Unsetenv("ORIGIN_SHARED_SECRET_PREVIOUS")

		cfg := config.Load()

		if cfg.OriginSharedSecretCurrent != "dev-current" {
			t.Errorf("OriginSharedSecretCurrent = %q, want %q", cfg.OriginSharedSecretCurrent, "dev-current")
		}
		if cfg.OriginSharedSecretPrevious != "dev-previous" {
			t.Errorf("OriginSharedSecretPrevious = %q, want %q", cfg.OriginSharedSecretPrevious, "dev-previous")
		}
	})
}
