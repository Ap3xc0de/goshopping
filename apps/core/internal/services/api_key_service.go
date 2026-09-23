package services

import (
	"context"
	"crypto/subtle"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrAPIKeyNotFound      = errors.New("api key not found")
	ErrAPIKeyInvalid       = errors.New("api key invalid")
	ErrAPIKeyStoreMismatch = errors.New("api key does not belong to this store")
)

const apiKeyColumns = `id, store_id, name, key_hash, prefix, active, last_used_at, expires_at, created_at, revoked_at`

// APIKeyService manages store-scoped developer API keys for the public
// storefront API.
type APIKeyService struct {
	db *pgxpool.Pool
}

// NewAPIKeyService creates a new APIKeyService.
func NewAPIKeyService(db *pgxpool.Pool) *APIKeyService {
	return &APIKeyService{db: db}
}

// Create generates a plaintext key and persists only its SHA-256 hash plus a
// display prefix. The plaintext is returned exactly once to the caller.
func (s *APIKeyService) Create(ctx context.Context, storeID uuid.UUID, name string) (string, *models.APIKey, error) {
	key := &models.APIKey{
		ID:      uuid.New(),
		StoreID: storeID,
		Name:    strings.TrimSpace(name),
		Active:  true,
	}
	if err := key.Validate(); err != nil {
		return "", nil, err
	}

	plaintext, err := models.GenerateKey()
	if err != nil {
		return "", nil, err
	}
	key.KeyHash = models.HashKey(plaintext)
	key.Prefix = models.PrefixOf(plaintext)

	err = s.db.QueryRow(ctx, `
		INSERT INTO store_api_keys (id, store_id, name, key_hash, prefix, active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at`,
		key.ID, key.StoreID, key.Name, key.KeyHash, key.Prefix, key.Active,
	).Scan(&key.CreatedAt)
	if err != nil {
		return "", nil, err
	}

	return plaintext, key, nil
}

// List returns every key of the store, newest first. key_hash is loaded but
// never serialized (models.APIKey tags it json:"-").
func (s *APIKeyService) List(ctx context.Context, storeID uuid.UUID) ([]models.APIKey, error) {
	rows, err := s.db.Query(ctx, `
		SELECT `+apiKeyColumns+`
		FROM store_api_keys WHERE store_id = $1
		ORDER BY created_at DESC, id DESC`,
		storeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := []models.APIKey{}
	for rows.Next() {
		k, err := scanAPIKey(rows)
		if err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

// Revoke soft-deletes a key: active=false plus revoked_at. Returns
// ErrAPIKeyNotFound when no revocable row matches id AND store — an already
// revoked key or another store's key can never be revoked here.
func (s *APIKeyService) Revoke(ctx context.Context, storeID, keyID uuid.UUID) error {
	result, err := s.db.Exec(ctx, `
		UPDATE store_api_keys SET active = false, revoked_at = NOW()
		WHERE id = $1 AND store_id = $2 AND revoked_at IS NULL`,
		keyID, storeID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrAPIKeyNotFound
	}
	return nil
}

// ValidateToken resolves a presented key against the store it must belong to.
// It hashes the token, looks the hash up through the single JOIN of the design,
// then rejects revoked/expired/inactive keys (ErrAPIKeyInvalid) and keys whose
// store does not match the requested slug (ErrAPIKeyStoreMismatch).
func (s *APIKeyService) ValidateToken(ctx context.Context, token, slug string) (*models.APIKey, error) {
	hash := models.HashKey(token)

	var key struct {
		models.APIKey
		StoreSlug string
	}
	err := s.db.QueryRow(ctx, `
		SELECT k.id, k.store_id, k.name, k.key_hash, k.prefix, k.active,
		       k.last_used_at, k.expires_at, k.created_at, k.revoked_at, s.slug
		FROM store_api_keys k
		JOIN stores s ON s.id = k.store_id
		WHERE k.key_hash = $1`,
		hash,
	).Scan(
		&key.ID, &key.StoreID, &key.Name, &key.KeyHash, &key.Prefix, &key.Active,
		&key.LastUsedAt, &key.ExpiresAt, &key.CreatedAt, &key.RevokedAt, &key.StoreSlug,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAPIKeyInvalid
		}
		return nil, err
	}

	// Constant-time comparison mirrors middleware/origin_secret.go's
	// secretMatches: even though the row was fetched BY this hash (the unique
	// index makes a mismatch impossible), never fall back to a variable-time
	// string compare on the token-derived value.
	if subtle.ConstantTimeCompare([]byte(key.KeyHash), []byte(hash)) != 1 {
		return nil, ErrAPIKeyInvalid
	}

	now := time.Now()
	if key.RevokedAt != nil || !key.Active {
		return nil, ErrAPIKeyInvalid
	}
	if key.ExpiresAt != nil && key.ExpiresAt.Before(now) {
		return nil, ErrAPIKeyInvalid
	}

	if key.StoreSlug != slug {
		return nil, ErrAPIKeyStoreMismatch
	}

	return &key.APIKey, nil
}

// TouchLastUsed records the most recent authenticated use of a key.
func (s *APIKeyService) TouchLastUsed(ctx context.Context, id uuid.UUID, lastUsedAt time.Time) error {
	_, err := s.db.Exec(ctx, `
		UPDATE store_api_keys SET last_used_at = $2 WHERE id = $1`,
		id, lastUsedAt,
	)
	return err
}

type apiKeyScanner interface {
	Scan(dest ...any) error
}

func scanAPIKey(row apiKeyScanner) (models.APIKey, error) {
	var k models.APIKey
	err := row.Scan(
		&k.ID, &k.StoreID, &k.Name, &k.KeyHash, &k.Prefix, &k.Active,
		&k.LastUsedAt, &k.ExpiresAt, &k.CreatedAt, &k.RevokedAt,
	)
	return k, err
}
