package models_test

import (
	"regexp"
	"strings"
	"testing"

	"github.com/goshopping/core/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var keyPattern = regexp.MustCompile(`^gsk_[0-9a-f]{40}$`)

// TestGenerateKey covers the key format contract: "gsk_" prefix plus 40
// lowercase hex chars derived from 20 crypto/rand bytes.
func TestGenerateKey(t *testing.T) {
	t.Run("format is gsk_ plus 40 hex chars", func(t *testing.T) {
		key, err := models.GenerateKey()
		require.NoError(t, err)
		assert.Regexp(t, keyPattern, key)
		assert.Len(t, key, 44)
	})

	t.Run("successive generations differ", func(t *testing.T) {
		a, err := models.GenerateKey()
		require.NoError(t, err)
		b, err := models.GenerateKey()
		require.NoError(t, err)
		assert.NotEqual(t, a, b)
	})
}

func TestHashKey(t *testing.T) {
	t.Run("deterministic sha256 hex output", func(t *testing.T) {
		assert.Equal(t, models.HashKey("gsk_abc"), models.HashKey("gsk_abc"))
	})

	t.Run("matches the known sha256 vector for 'abc'", func(t *testing.T) {
		assert.Equal(t, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", models.HashKey("abc"))
	})

	t.Run("different inputs produce different hashes", func(t *testing.T) {
		assert.NotEqual(t, models.HashKey("gsk_aaa"), models.HashKey("gsk_bbb"))
	})
}

func TestPrefixOf(t *testing.T) {
	t.Run("returns the first 12 chars of the plaintext", func(t *testing.T) {
		assert.Equal(t, "gsk_01234567", models.PrefixOf("gsk_0123456789abcdef0123456789abcdef012345"))
	})

	t.Run("returns input untouched when shorter than 12 chars", func(t *testing.T) {
		assert.Equal(t, "gsk_short", models.PrefixOf("gsk_short"))
	})
}

// TestAPIKeyValidate covers the Key Name Validation requirement: the name must
// be non-empty after trimming and at most 100 chars.
func TestAPIKeyValidate(t *testing.T) {
	tests := []struct {
		name    string
		keyName string
		wantErr bool
	}{
		{"accepts a normal name", "Production mobile app", false},
		{"accepts a 100-char name", strings.Repeat("n", 100), false},
		{"rejects empty name", "", true},
		{"rejects whitespace-only name", "   ", true},
		{"rejects 101-char name", strings.Repeat("n", 101), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			k := models.APIKey{Name: tt.keyName}
			err := k.Validate()
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
