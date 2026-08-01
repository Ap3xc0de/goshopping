package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// OutboxService persists domain events transactionally, then publishes to SQS.
type OutboxService struct {
	db       *pgxpool.Pool
	eventSvc *EventService
	cfg      *config.Config
}

// NewOutboxService creates an OutboxService.
func NewOutboxService(db *pgxpool.Pool, eventSvc *EventService, cfg *config.Config) *OutboxService {
	return &OutboxService{db: db, eventSvc: eventSvc, cfg: cfg}
}

// InsertTx writes an outbox row inside an existing transaction.
func (s *OutboxService) InsertTx(ctx context.Context, tx pgx.Tx, storeID uuid.UUID, eventType string, payload interface{}) (uuid.UUID, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return uuid.Nil, fmt.Errorf("outbox marshal: %w", err)
	}
	var id uuid.UUID
	if err = tx.QueryRow(ctx, `
		INSERT INTO outbox_events (store_id, event_type, payload)
		VALUES ($1, $2, $3)
		RETURNING id`, storeID, eventType, body,
	).Scan(&id); err != nil {
		return uuid.Nil, fmt.Errorf("outbox insert: %w", err)
	}
	return id, nil
}

// PublishOne tries to publish a single outbox event; on failure leaves it for retry.
func (s *OutboxService) PublishOne(ctx context.Context, id, storeID uuid.UUID, eventType string, payload interface{}) error {
	if err := s.eventSvc.Publish(s.cfg.SQSOrderEventsURL, eventType, storeID.String(), payload); err != nil {
		return err
	}
	if _, err := s.db.Exec(ctx, `UPDATE outbox_events SET published_at = NOW() WHERE id = $1 AND published_at IS NULL`, id); err != nil {
		return fmt.Errorf("outbox mark published: %w", err)
	}
	return nil
}

// PublishPending drains unpublished outbox rows (best-effort batch).
// ponytail: no backoff/lease — enough for low volume; upgrade to SKIP LOCKED + worker if needed.
func (s *OutboxService) PublishPending(ctx context.Context) (int, error) {
	if s.cfg.SQSOrderEventsURL == "" {
		return 0, nil
	}
	rows, err := s.db.Query(ctx, `
		SELECT id, store_id, event_type, payload
		FROM outbox_events
		WHERE published_at IS NULL
		ORDER BY created_at ASC
		LIMIT 50`)
	if err != nil {
		return 0, fmt.Errorf("outbox query pending: %w", err)
	}
	defer rows.Close()

	published := 0
	for rows.Next() {
		var (
			id        uuid.UUID
			storeID   uuid.UUID
			eventType string
			payload   json.RawMessage
		)
		if err := rows.Scan(&id, &storeID, &eventType, &payload); err != nil {
			return published, fmt.Errorf("outbox scan: %w", err)
		}
		if err := s.PublishOne(ctx, id, storeID, eventType, payload); err != nil {
			log.Printf("outbox: publish %s failed (will retry): %v", id, err)
			continue
		}
		published++
	}
	return published, rows.Err()
}
