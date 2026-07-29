package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Integration represents a store's connection to an external service.
type Integration struct {
	ID         uuid.UUID       `json:"id"           db:"id"`
	StoreID    uuid.UUID       `json:"store_id"     db:"store_id"`
	Type       string          `json:"type"         db:"type"`     // accounting | payment | marketing | whatsapp | email
	Provider   string          `json:"provider"     db:"provider"` // e.g. siigo, wompi, meta
	Config     json.RawMessage `json:"config"       db:"config"`
	Status     string          `json:"status"       db:"status"` // active | inactive | error
	LastSyncAt *time.Time      `json:"last_sync_at" db:"last_sync_at"`
	CreatedAt  time.Time       `json:"created_at"   db:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"   db:"updated_at"`
}
