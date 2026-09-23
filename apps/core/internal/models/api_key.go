package models

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"github.com/google/uuid"
)

// APIKey is a store-scoped developer key for the public storefront API. Only
// the SHA-256 hash of the plaintext is persisted; the plaintext is returned
// exactly once at creation time.
type APIKey struct {
	ID         uuid.UUID  `json:"id"`
	StoreID    uuid.UUID  `json:"store_id"`
	Name       string     `json:"name"`
	KeyHash    string     `json:"-"`
	Prefix     string     `json:"prefix"`
	Active     bool       `json:"active"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
}

// Validate checks the key's own invariants, independent of persistence.
// The name must be non-empty after trimming and at most 100 chars.
func (k *APIKey) Validate() error {
	var errs ValidationErrors

	name := strings.TrimSpace(k.Name)
	if name == "" {
		errs = append(errs, FieldError{Field: "name", Message: "is required"})
	} else if len(name) > 100 {
		errs = append(errs, FieldError{Field: "name", Message: "must be at most 100 characters"})
	}

	if len(errs) == 0 {
		return nil
	}
	return errs
}

// GenerateKey produces a plaintext key with 160 bits of entropy sourced from
// crypto/rand: "gsk_" followed by 40 lowercase hex chars.
func GenerateKey() (string, error) {
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "gsk_" + hex.EncodeToString(b), nil
}

// HashKey returns the SHA-256 hex digest of a plaintext key. The 64-char
// result is the only representation ever persisted.
func HashKey(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}

// PrefixOf returns the display prefix of a plaintext key: its first 12 chars
// ("gsk_" plus 8 hex).
func PrefixOf(plaintext string) string {
	if len(plaintext) > 12 {
		return plaintext[:12]
	}
	return plaintext
}
