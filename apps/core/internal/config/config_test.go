package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateJWTRefuseStagingProduction(t *testing.T) {
	for _, env := range []string{"staging", "production"} {
		t.Run(env+"/empty", func(t *testing.T) {
			cfg := &Config{AppEnv: env, JWTSecret: ""}
			err := cfg.Validate()
			require.Error(t, err)
			assert.Contains(t, err.Error(), "JWT_SECRET")
		})
		t.Run(env+"/short", func(t *testing.T) {
			cfg := &Config{AppEnv: env, JWTSecret: "too-short"}
			err := cfg.Validate()
			require.Error(t, err)
			assert.Contains(t, err.Error(), "32")
		})
	}
}

func TestValidateJWTAllowsDevelopmentShortSecret(t *testing.T) {
	cfg := &Config{AppEnv: "development", JWTSecret: "short"}
	assert.NoError(t, cfg.Validate())
}

func TestValidateJWTAcceptsLongSecret(t *testing.T) {
	secret := "test-secret-for-goshopping-tests-xxxxxxxx"
	for _, env := range []string{"development", "staging", "production"} {
		cfg := &Config{AppEnv: env, JWTSecret: secret}
		assert.NoError(t, cfg.Validate())
	}
}
