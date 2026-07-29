package models

import (
	"time"

	"github.com/google/uuid"
)

// StoreUser is the many-to-many join between accounts and stores with a role.
type StoreUser struct {
	ID        uuid.UUID `json:"id"         db:"id"`
	StoreID   uuid.UUID `json:"store_id"   db:"store_id"`
	AccountID uuid.UUID `json:"account_id" db:"account_id"`
	Role      string    `json:"role"       db:"role"` // owner | operator | accountant
	InvitedAt time.Time `json:"invited_at" db:"invited_at"`
}
