package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrShopperNotFound is returned when no shopper matches the Cognito sub.
var ErrShopperNotFound = errors.New("shopper not found")

// Shopper is a Cognito-authenticated marketplace user.
type Shopper struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	AvatarURL    string    `json:"avatar_url"`
	AuthProvider string    `json:"auth_provider"`
	CreatedAt    time.Time `json:"created_at"`
}

// ShopperService manages shopper profiles.
type ShopperService struct {
	db *pgxpool.Pool
}

// NewShopperService creates a ShopperService.
func NewShopperService(db *pgxpool.Pool) *ShopperService {
	return &ShopperService{db: db}
}

const shopperColumns = `id, COALESCE(email, ''), COALESCE(name, ''), COALESCE(avatar_url, ''), auth_provider, created_at`

func scanShopper(row pgx.Row) (*Shopper, error) {
	var s Shopper
	if err := row.Scan(&s.ID, &s.Email, &s.Name, &s.AvatarURL, &s.AuthProvider, &s.CreatedAt); err != nil {
		return nil, err
	}
	return &s, nil
}

// UpsertFromClaims inserts or updates the shopper identified by the Cognito
// sub. Email and name are only overwritten by non-empty values, so access
// tokens (which carry neither) never blank an existing profile. An empty
// provider keeps the stored one ("cognito" on first insert).
func (s *ShopperService) UpsertFromClaims(ctx context.Context, sub, email, name, provider string) (*Shopper, error) {
	if sub == "" {
		return nil, errors.New("empty cognito sub")
	}
	shopper, err := scanShopper(s.db.QueryRow(ctx, `
		INSERT INTO shoppers (cognito_sub, email, name, auth_provider)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), COALESCE(NULLIF($4, ''), 'cognito'))
		ON CONFLICT (cognito_sub) DO UPDATE SET
			email = COALESCE(NULLIF($2, ''), shoppers.email),
			name = COALESCE(NULLIF($3, ''), shoppers.name),
			auth_provider = COALESCE(NULLIF($4, ''), shoppers.auth_provider)
		RETURNING `+shopperColumns,
		sub, email, name, provider))
	if err != nil {
		return nil, fmt.Errorf("upsert shopper: %w", err)
	}
	return shopper, nil
}

// GetBySub returns the shopper for a Cognito sub, or ErrShopperNotFound.
func (s *ShopperService) GetBySub(ctx context.Context, sub string) (*Shopper, error) {
	shopper, err := scanShopper(s.db.QueryRow(ctx,
		`SELECT `+shopperColumns+` FROM shoppers WHERE cognito_sub = $1`, sub))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrShopperNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get shopper: %w", err)
	}
	return shopper, nil
}
