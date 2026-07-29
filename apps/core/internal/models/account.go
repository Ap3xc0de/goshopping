package models

import (
	"time"

	"github.com/google/uuid"
)

// Account represents a user account in the system.
type Account struct {
	ID           uuid.UUID `json:"id"         db:"id"`
	Email        string    `json:"email"      db:"email"`
	PasswordHash string    `json:"-"          db:"password_hash"` // never serialised
	Name         string    `json:"name"       db:"name"`
	Role         string    `json:"role"       db:"role"` // superadmin | owner
	Status       string    `json:"status"     db:"status"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// RegisterRequest is the DTO for account creation.
type RegisterRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name"     validate:"required,min=2"`
}

// LoginRequest is the DTO for authentication.
type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// AuthResponse is returned after successful register, login, or token refresh.
type AuthResponse struct {
	AccessToken  string  `json:"access_token"`
	RefreshToken string  `json:"refresh_token"`
	Account      Account `json:"account"`
}

// RefreshRequest is the DTO for token renewal.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// StoreAccess carries a store_id and the account's role within that store.
type StoreAccess struct {
	StoreID string `json:"store_id"`
	Role    string `json:"role"` // owner | operator | accountant
}
