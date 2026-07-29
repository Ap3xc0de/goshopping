package services

import (
	"context"
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

// ErrInvalidCredentials is returned when email or password do not match.
var ErrInvalidCredentials = errors.New("invalid email or password")

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
	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return models.AuthResponse{}, fmt.Errorf("bcrypt: %w", err)
	}

	ctx := context.Background()
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.AuthResponse{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Insert account
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

	// Auto-create first store
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

	// Link account → store with role=owner
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

// RefreshToken validates a refresh token and issues a new token pair.
func (s *AuthService) RefreshToken(refreshToken string) (models.AuthResponse, error) {
	claims, err := s.parseToken(refreshToken)
	if err != nil {
		return models.AuthResponse{}, ErrInvalidToken
	}

	// Verify token type
	if tokenType, _ := claims["token_type"].(string); tokenType != "refresh" {
		return models.AuthResponse{}, ErrInvalidToken
	}

	accountIDStr, _ := claims["sub"].(string)
	accountID, err := uuid.Parse(accountIDStr)
	if err != nil {
		return models.AuthResponse{}, ErrInvalidToken
	}

	ctx := context.Background()
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

// generateTokenPair creates a JWT access token and a longer-lived refresh token.
func (s *AuthService) generateTokenPair(account models.Account, stores []models.StoreAccess) (accessToken, refreshToken string, err error) {
	now := time.Now()

	// Access token
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

	// Refresh token
	refreshClaims := jwt.MapClaims{
		"sub":        account.ID.String(),
		"token_type": "refresh",
		"iat":        now.Unix(),
		"exp":        now.Add(s.cfg.JWTRefreshExpiry).Unix(),
	}
	refreshToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).
		SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", "", fmt.Errorf("sign refresh token: %w", err)
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
	// Collapse repeated dashes and trim
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	slug = strings.Trim(slug, "-")
	// Append a short uuid fragment to guarantee uniqueness
	slug = slug + "-" + uuid.New().String()[:8]
	return slug
}
