package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Store represents a tenant store.
type Store struct {
	ID        uuid.UUID       `json:"id"         db:"id"`
	AccountID uuid.UUID       `json:"account_id" db:"account_id"`
	Name      string          `json:"name"       db:"name"`
	Slug      string          `json:"slug"       db:"slug"`
	Domain    string          `json:"domain"     db:"domain"`
	Status    string          `json:"status"     db:"status"`
	Config    json.RawMessage `json:"config"     db:"config"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt time.Time       `json:"updated_at" db:"updated_at"`
}

// StoreConfig holds store-level settings stored as JSONB.
type StoreConfig struct {
	Currency string `json:"currency"`
	Locale   string `json:"locale"`
	Timezone string `json:"timezone"`
}
