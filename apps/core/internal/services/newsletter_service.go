package services

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	// ErrInvalidEmail is returned by Subscribe for an empty or malformed email.
	ErrInvalidEmail = errors.New("invalid email")
	// ErrSubscriberExists is returned when the email is already subscribed for
	// this store (UNIQUE(store_id, email) — the real duplicate guard).
	ErrSubscriberExists = errors.New("email already subscribed")
)

// Rate limit policy (design decision 4): fixed window, 5 requests per minute
// per "store_id|ip" key. Best-effort, per-instance — the DB UNIQUE constraint
// is the real duplicate guard.
const (
	newsletterRateLimitMax    = 5
	newsletterRateLimitWindow = time.Minute
)

// rateWindow tracks one key's current fixed window.
type rateWindow struct {
	windowStart time.Time
	count       int
}

// NewsletterRateLimiter is a fixed-window in-memory limiter, safe for
// concurrent use. Construct with NewNewsletterRateLimiter; the zero value is
// unusable (nil windows map).
type NewsletterRateLimiter struct {
	mu      sync.Mutex
	windows map[string]*rateWindow
	max     int
	window  time.Duration
	now     func() time.Time
}

// NewNewsletterRateLimiter creates a limiter with the default 5/min policy.
func NewNewsletterRateLimiter() *NewsletterRateLimiter {
	return &NewsletterRateLimiter{
		windows: make(map[string]*rateWindow),
		max:     newsletterRateLimitMax,
		window:  newsletterRateLimitWindow,
		now:     time.Now,
	}
}

// Allow reports whether key may proceed, incrementing its counter when it
// does. key is "store_id|ip" (design decision 4) — every request against
// POST /newsletter consumes a slot, regardless of whether it later succeeds.
func (l *NewsletterRateLimiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	w, ok := l.windows[key]
	if !ok || now.Sub(w.windowStart) >= l.window {
		l.windows[key] = &rateWindow{windowStart: now, count: 1}
		return true
	}
	if w.count >= l.max {
		return false
	}
	w.count++
	return true
}

// NewsletterService handles newsletter subscription business logic.
type NewsletterService struct {
	db *pgxpool.Pool
}

// NewNewsletterService creates a new NewsletterService.
func NewNewsletterService(db *pgxpool.Pool) *NewsletterService {
	return &NewsletterService{db: db}
}

// Subscribe validates and inserts a subscriber. Duplicate emails (per store)
// return ErrSubscriberExists (409 at the API boundary). Callers are
// responsible for running the rate limiter check BEFORE calling Subscribe —
// Subscribe itself has no notion of IPs.
func (s *NewsletterService) Subscribe(ctx context.Context, storeID uuid.UUID, email string) (*models.NewsletterSubscriber, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return nil, ErrInvalidEmail
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, ErrInvalidEmail
	}

	var sub models.NewsletterSubscriber
	err := s.db.QueryRow(ctx, `
		INSERT INTO newsletter_subscribers (store_id, email, status)
		VALUES ($1, $2, 'active')
		RETURNING id, store_id, email, status, created_at`,
		storeID, email,
	).Scan(&sub.ID, &sub.StoreID, &sub.Email, &sub.Status, &sub.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrSubscriberExists
		}
		return nil, fmt.Errorf("subscribe: %w", err)
	}
	return &sub, nil
}
