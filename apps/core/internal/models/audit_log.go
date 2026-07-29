package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// AuditLog records every significant action for compliance and debugging.
type AuditLog struct {
	ID         uuid.UUID       `json:"id"          db:"id"`
	AccountID  *uuid.UUID      `json:"account_id"  db:"account_id"`
	StoreID    *uuid.UUID      `json:"store_id"    db:"store_id"`
	Action     string          `json:"action"      db:"action"`
	EntityType string          `json:"entity_type" db:"entity_type"`
	EntityID   *uuid.UUID      `json:"entity_id"   db:"entity_id"`
	Details    json.RawMessage `json:"details"     db:"details"`
	IP         string          `json:"ip"          db:"ip"`
	CreatedAt  time.Time       `json:"created_at"  db:"created_at"`
}
