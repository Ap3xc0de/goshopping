package services

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrOfferNotFound indicates no offer matches the given id within the store.
var ErrOfferNotFound = errors.New("offer not found")

// OfferService handles CRUD and active-offer queries for store offers.
type OfferService struct {
	db *pgxpool.Pool
}

// NewOfferService creates a new OfferService.
func NewOfferService(db *pgxpool.Pool) *OfferService {
	return &OfferService{db: db}
}

const offerColumns = `id, store_id, name, COALESCE(description,''), discount_type, discount_value,
	scope, scope_value, starts_at, ends_at, status, created_at, updated_at`

// rowScanner is satisfied by both pgx.Row (QueryRow) and pgx.Rows (Query),
// letting scanOffer serve both single-row and iterated-row call sites.
type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanOffer(row rowScanner) (models.Offer, error) {
	var o models.Offer
	err := row.Scan(&o.ID, &o.StoreID, &o.Name, &o.Description, &o.DiscountType, &o.DiscountValue,
		&o.Scope, &o.ScopeValue, &o.StartsAt, &o.EndsAt, &o.Status, &o.CreatedAt, &o.UpdatedAt)
	return o, err
}

// ListOffersResult holds a paginated list of offers.
type ListOffersResult struct {
	Offers     []models.Offer
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// ListOffers returns a paginated list of every offer for a store, regardless
// of status or window (admin management view — see ListActiveOffers for the
// catalog-facing "currently applicable" subset).
func (s *OfferService) ListOffers(ctx context.Context, storeID uuid.UUID, page, perPage int) (*ListOffersResult, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM offers WHERE store_id = $1`, storeID).Scan(&total); err != nil {
		return nil, fmt.Errorf("count offers: %w", err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT `+offerColumns+`
		FROM offers
		WHERE store_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`, storeID, perPage, offset)
	if err != nil {
		return nil, fmt.Errorf("query offers: %w", err)
	}
	defer rows.Close()

	offers := []models.Offer{}
	for rows.Next() {
		o, err := scanOffer(rows)
		if err != nil {
			return nil, fmt.Errorf("scan offer: %w", err)
		}
		offers = append(offers, o)
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}
	return &ListOffersResult{Offers: offers, Total: total, Page: page, PerPage: perPage, TotalPages: totalPages}, nil
}

// GetOffer returns a single offer by ID, scoped to the store.
func (s *OfferService) GetOffer(ctx context.Context, storeID, offerID uuid.UUID) (*models.Offer, error) {
	row := s.db.QueryRow(ctx, `SELECT `+offerColumns+` FROM offers WHERE id = $1 AND store_id = $2`, offerID, storeID)
	o, err := scanOffer(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOfferNotFound
		}
		return nil, fmt.Errorf("get offer: %w", err)
	}
	return &o, nil
}

// CreateOffer validates and creates a new offer for the given store.
// Defaults scope to "store" and status to "active" when omitted, mirroring
// the migration's column defaults.
func (s *OfferService) CreateOffer(ctx context.Context, storeID uuid.UUID, req models.CreateOfferRequest) (*models.Offer, error) {
	scope := req.Scope
	if scope == "" {
		scope = "store"
	}
	status := req.Status
	if status == "" {
		status = "active"
	}

	candidate := models.Offer{
		StoreID:       storeID,
		Name:          req.Name,
		Description:   req.Description,
		DiscountType:  req.DiscountType,
		DiscountValue: req.DiscountValue,
		Scope:         scope,
		ScopeValue:    req.ScopeValue,
		StartsAt:      req.StartsAt,
		EndsAt:        req.EndsAt,
		Status:        status,
	}
	if err := candidate.Validate(); err != nil {
		return nil, err
	}

	row := s.db.QueryRow(ctx, `
		INSERT INTO offers (store_id, name, description, discount_type, discount_value, scope, scope_value, starts_at, ends_at, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING `+offerColumns,
		storeID, candidate.Name, candidate.Description, candidate.DiscountType, candidate.DiscountValue,
		candidate.Scope, candidate.ScopeValue, candidate.StartsAt, candidate.EndsAt, candidate.Status,
	)
	o, err := scanOffer(row)
	if err != nil {
		return nil, fmt.Errorf("create offer: %w", err)
	}
	return &o, nil
}

// UpdateOffer applies a partial update to an offer, re-validating the merged
// result before writing so an invalid change never persists.
func (s *OfferService) UpdateOffer(ctx context.Context, storeID, offerID uuid.UUID, req models.UpdateOfferRequest) (*models.Offer, error) {
	cur, err := s.GetOffer(ctx, storeID, offerID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		cur.Name = *req.Name
	}
	if req.Description != nil {
		cur.Description = *req.Description
	}
	if req.DiscountType != nil {
		cur.DiscountType = *req.DiscountType
	}
	if req.DiscountValue != nil {
		cur.DiscountValue = *req.DiscountValue
	}
	if req.Scope != nil {
		cur.Scope = *req.Scope
	}
	if req.ScopeValue != nil {
		cur.ScopeValue = req.ScopeValue
	}
	if req.StartsAt != nil {
		cur.StartsAt = req.StartsAt
	}
	if req.EndsAt != nil {
		cur.EndsAt = req.EndsAt
	}
	if req.Status != nil {
		cur.Status = *req.Status
	}

	if err := cur.Validate(); err != nil {
		return nil, err
	}

	row := s.db.QueryRow(ctx, `
		UPDATE offers
		SET name=$1, description=$2, discount_type=$3, discount_value=$4, scope=$5, scope_value=$6,
		    starts_at=$7, ends_at=$8, status=$9, updated_at=NOW()
		WHERE id=$10 AND store_id=$11
		RETURNING `+offerColumns,
		cur.Name, cur.Description, cur.DiscountType, cur.DiscountValue, cur.Scope, cur.ScopeValue,
		cur.StartsAt, cur.EndsAt, cur.Status, offerID, storeID,
	)
	updated, err := scanOffer(row)
	if err != nil {
		return nil, fmt.Errorf("update offer: %w", err)
	}
	return &updated, nil
}

// DeleteOffer hard-deletes an offer scoped to the store (offers have no
// soft-delete status, unlike products).
func (s *OfferService) DeleteOffer(ctx context.Context, storeID, offerID uuid.UUID) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM offers WHERE id = $1 AND store_id = $2`, offerID, storeID)
	if err != nil {
		return fmt.Errorf("delete offer: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrOfferNotFound
	}
	return nil
}

// ListActiveOffers returns offers with status='active' whose time window
// (if any) covers the current instant, leveraging idx_offers_store_active_window.
// Consumed by the public catalog (slice 3) and quote computation (slice 4) to
// load all candidates once per request instead of querying per product.
func (s *OfferService) ListActiveOffers(ctx context.Context, storeID uuid.UUID) ([]models.Offer, error) {
	rows, err := s.db.Query(ctx, `
		SELECT `+offerColumns+`
		FROM offers
		WHERE store_id = $1
		  AND status = 'active'
		  AND (starts_at IS NULL OR starts_at <= NOW())
		  AND (ends_at IS NULL OR ends_at >= NOW())`, storeID)
	if err != nil {
		return nil, fmt.Errorf("query active offers: %w", err)
	}
	defer rows.Close()

	offers := []models.Offer{}
	for rows.Next() {
		o, err := scanOffer(rows)
		if err != nil {
			return nil, fmt.Errorf("scan offer: %w", err)
		}
		offers = append(offers, o)
	}
	return offers, nil
}
