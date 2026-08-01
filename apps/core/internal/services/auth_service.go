package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12 // ponytail: DefaultCost is 10; 12 is a deliberate bump

// ErrInvalidCredentials is returned when email or password do not match.
var ErrInvalidCredentials = errors.New("invalid email or password")

// ErrAccountSuspended is returned when the account is not active.
var ErrAccountSuspended = errors.New("account is not active")

// ErrEmailTaken is returned when the email is already registered.
var ErrEmailTaken = errors.New("email already registered")

// ErrInvalidToken is returned when a JWT is malformed or expired.
var ErrInvalidToken = errors.New("invalid or expired token")

// AuthService handles account creation, login, and token management.
type AuthService struct {
	db  *pgxpool.Pool
	cfg *config.Config
}

// NewAuthService creates an AuthService.
func NewAuthService(db *pgxpool.Pool, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

// Register creates a new account with role=owner and provisions an initial store.
func (s *AuthService) Register(req models.RegisterRequest) (models.AuthResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return models.AuthResponse{}, fmt.Errorf("bcrypt: %w", err)
	}

	ctx := context.Background()
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.AuthResponse{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var account models.Account
	err = tx.QueryRow(ctx, `
		INSERT INTO accounts (email, password_hash, name, role, status)
		VALUES ($1, $2, $3, 'owner', 'active')
		RETURNING id, email, name, role, status, created_at, updated_at`,
		strings.ToLower(req.Email), string(hash), req.Name,
	).Scan(&account.ID, &account.Email, &account.Name, &account.Role, &account.Status,
		&account.CreatedAt, &account.UpdatedAt)
	if err != nil {
		if isDuplicateKeyError(err) {
			return models.AuthResponse{}, ErrEmailTaken
		}
		return models.AuthResponse{}, fmt.Errorf("insert account: %w", err)
	}

	storeSlug := generateSlug(req.Name)
	var storeID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO stores (account_id, name, slug, status)
		VALUES ($1, $2, $3, 'active')
		RETURNING id`,
		account.ID, req.Name+"'s Store", storeSlug,
	).Scan(&storeID)
	if err != nil {
		return models.AuthResponse{}, fmt.Errorf("insert store: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO store_users (store_id, account_id, role)
		VALUES ($1, $2, 'owner')`,
		storeID, account.ID,
	)
	if err != nil {
		return models.AuthResponse{}, fmt.Errorf("insert store_user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.AuthResponse{}, fmt.Errorf("commit tx: %w", err)
	}

	storeAccesses := []models.StoreAccess{{StoreID: storeID.String(), Role: "owner"}}
	access, refresh, err := s.generateTokenPair(account, storeAccesses)
	if err != nil {
		return models.AuthResponse{}, err
	}

	return models.AuthResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		Account:      account,
	}, nil
}

// Login verifies credentials and returns a token pair.
func (s *AuthService) Login(req models.LoginRequest) (models.AuthResponse, error) {
	ctx := context.Background()

	var account models.Account
	err := s.db.QueryRow(ctx, `
		SELECT id, email, password_hash, name, role, status, created_at, updated_at
		FROM accounts
		WHERE email = $1`,
		strings.ToLower(req.Email),
	).Scan(&account.ID, &account.Email, &account.PasswordHash, &account.Name,
		&account.Role, &account.Status, &account.CreatedAt, &account.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.AuthResponse{}, ErrInvalidCredentials
		}
		return models.AuthResponse{}, fmt.Errorf("query account: %w", err)
	}

	if account.Status != "active" {
		return models.AuthResponse{}, ErrAccountSuspended
	}

	if err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(req.Password)); err != nil {
		return models.AuthResponse{}, ErrInvalidCredentials
	}

	storeAccesses, err := s.getStoreAccesses(ctx, account.ID)
	if err != nil {
		return models.AuthResponse{}, err
	}

	access, refresh, err := s.generateTokenPair(account, storeAccesses)
	if err != nil {
		return models.AuthResponse{}, err
	}

	return models.AuthResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		Account:      account,
	}, nil
}

// RefreshToken validates a refresh token, rotates it, and issues a new pair.
func (s *AuthService) RefreshToken(refreshToken string) (models.AuthResponse, error) {
	claims, err := s.parseToken(refreshToken)
	if err != nil {
		return models.AuthResponse{}, ErrInvalidToken
	}

	if tokenType, _ := claims["token_type"].(string); tokenType != "refresh" {
		return models.AuthResponse{}, ErrInvalidToken
	}

	accountIDStr, _ := claims["sub"].(string)
	accountID, err := uuid.Parse(accountIDStr)
	if err != nil {
		return models.AuthResponse{}, ErrInvalidToken
	}

	ctx := context.Background()
	hash := hashToken(refreshToken)

	var existingID uuid.UUID
	err = s.db.QueryRow(ctx, `
		SELECT id FROM refresh_tokens
		WHERE token_hash = $1 AND account_id = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
		hash, accountID,
	).Scan(&existingID)
	if err != nil {
		return models.AuthResponse{}, ErrInvalidToken
	}

	// Rotate: revoke the presented token before issuing a new pair.
	if _, err := s.db.Exec(ctx, `
		UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, existingID); err != nil {
		return models.AuthResponse{}, fmt.Errorf("revoke refresh token: %w", err)
	}

	var account models.Account
	err = s.db.QueryRow(ctx, `
		SELECT id, email, name, role, status, created_at, updated_at
		FROM accounts WHERE id = $1`,
		accountID,
	).Scan(&account.ID, &account.Email, &account.Name, &account.Role, &account.Status,
		&account.CreatedAt, &account.UpdatedAt)
	if err != nil {
		return models.AuthResponse{}, ErrInvalidToken
	}

	if account.Status != "active" {
		return models.AuthResponse{}, ErrAccountSuspended
	}

	storeAccesses, err := s.getStoreAccesses(ctx, account.ID)
	if err != nil {
		return models.AuthResponse{}, err
	}

	access, refresh, err := s.generateTokenPair(account, storeAccesses)
	if err != nil {
		return models.AuthResponse{}, err
	}

	return models.AuthResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		Account:      account,
	}, nil
}

// Logout revokes the given refresh token. If valid, also revokes all tokens for that account.
func (s *AuthService) Logout(refreshToken string) error {
	if refreshToken == "" {
		return nil // ponytail: idempotent logout
	}

	ctx := context.Background()
	hash := hashToken(refreshToken)

	var accountID uuid.UUID
	err := s.db.QueryRow(ctx, `
		SELECT account_id FROM refresh_tokens
		WHERE token_hash = $1 AND revoked_at IS NULL`,
		hash,
	).Scan(&accountID)
	if err != nil {
		// Best-effort: try JWT path for account_id even if row missing.
		if claims, parseErr := s.parseToken(refreshToken); parseErr == nil {
			if sub, _ := claims["sub"].(string); sub != "" {
				if id, idErr := uuid.Parse(sub); idErr == nil {
					return s.RevokeAllRefreshTokens(id)
				}
			}
		}
		return nil // ponytail: logout is idempotent — missing token is still success
	}

	return s.RevokeAllRefreshTokens(accountID)
}

// RevokeAllRefreshTokens marks every refresh token for an account as revoked.
func (s *AuthService) RevokeAllRefreshTokens(accountID uuid.UUID) error {
	_, err := s.db.Exec(context.Background(), `
		UPDATE refresh_tokens SET revoked_at = NOW()
		WHERE account_id = $1 AND revoked_at IS NULL`, accountID)
	return err
}

// generateTokenPair creates a JWT access token and a longer-lived refresh token,
// persisting the refresh token hash for rotation/revocation.
func (s *AuthService) generateTokenPair(account models.Account, stores []models.StoreAccess) (accessToken, refreshToken string, err error) {
	now := time.Now()

	accessClaims := jwt.MapClaims{
		"sub":        account.ID.String(),
		"role":       account.Role,
		"stores":     stores,
		"token_type": "access",
		"iat":        now.Unix(),
		"exp":        now.Add(s.cfg.JWTAccessExpiry).Unix(),
	}
	accessToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).
		SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", "", fmt.Errorf("sign access token: %w", err)
	}

	jti := uuid.New().String()
	refreshExp := now.Add(s.cfg.JWTRefreshExpiry)
	refreshClaims := jwt.MapClaims{
		"sub":        account.ID.String(),
		"token_type": "refresh",
		"jti":        jti,
		"iat":        now.Unix(),
		"exp":        refreshExp.Unix(),
	}
	refreshToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).
		SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", "", fmt.Errorf("sign refresh token: %w", err)
	}

	_, err = s.db.Exec(context.Background(), `
		INSERT INTO refresh_tokens (account_id, token_hash, expires_at)
		VALUES ($1, $2, $3)`,
		account.ID, hashToken(refreshToken), refreshExp,
	)
	if err != nil {
		return "", "", fmt.Errorf("store refresh token: %w", err)
	}

	return accessToken, refreshToken, nil
}

func (s *AuthService) parseToken(tokenStr string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

func (s *AuthService) getStoreAccesses(ctx context.Context, accountID uuid.UUID) ([]models.StoreAccess, error) {
	rows, err := s.db.Query(ctx, `
		SELECT store_id, role FROM store_users WHERE account_id = $1`, accountID)
	if err != nil {
		return nil, fmt.Errorf("query store_users: %w", err)
	}
	defer rows.Close()

	var accesses []models.StoreAccess
	for rows.Next() {
		var sa models.StoreAccess
		var storeID uuid.UUID
		if err := rows.Scan(&storeID, &sa.Role); err != nil {
			return nil, err
		}
		sa.StoreID = storeID.String()
		accesses = append(accesses, sa)
	}
	return accesses, rows.Err()
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func isDuplicateKeyError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "unique constraint") ||
		strings.Contains(err.Error(), "duplicate key")
}

// generateSlug creates a URL-safe slug from the given name.
func generateSlug(name string) string {
	slug := strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return unicode.ToLower(r)
		}
		return '-'
	}, name)
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	slug = strings.Trim(slug, "-")
	slug = slug + "-" + uuid.New().String()[:8]
	return slug
}
