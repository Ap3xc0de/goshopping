package models

import (
	"time"

	"github.com/google/uuid"
)

// Customer represents a store's customer.
type Customer struct {
	ID        uuid.UUID `json:"id"         db:"id"`
	StoreID   uuid.UUID `json:"store_id"   db:"store_id"`
	Name      string    `json:"name"       db:"name"`
	Email     string    `json:"email"      db:"email"`
	Phone     string    `json:"phone"      db:"phone"`
	Address   string    `json:"address"    db:"address"`
	Notes     string    `json:"notes"      db:"notes"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// CreateCustomerRequest is the DTO for customer creation.
type CreateCustomerRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
	Notes   string `json:"notes"`
}

// UpdateCustomerRequest is the DTO for partial customer update.
type UpdateCustomerRequest struct {
	Name    *string `json:"name"`
	Email   *string `json:"email"`
	Phone   *string `json:"phone"`
	Address *string `json:"address"`
	Notes   *string `json:"notes"`
}
