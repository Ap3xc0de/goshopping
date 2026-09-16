package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrCouponNotFound  = errors.New("coupon not found")
	ErrCouponCodeTaken = errors.New("coupon code already in use for this store")
)

// CouponService handles coupon CRUD operations.
type CouponService struct {
	db *pgxpool.Pool
}

// NewCouponService creates a new CouponService.
func NewCouponService(db *pgxpool.Pool) *CouponService {
	return &CouponService{db: db}
}

// CreateCoupon inserts a new coupon.
func (s *CouponService) CreateCoupon(ctx context.Context, storeID uuid.UUID, req models.CreateCouponRequest) (*models.Coupon, error) {
	coupon := &models.Coupon{
		ID:            uuid.New(),
		StoreID:       storeID,
		Code:          req.Code,
		Name:          req.Name,
		Description:   req.Description,
		DiscountType:  req.DiscountType,
		DiscountValue: req.DiscountValue,
		UsageType:     req.UsageType,
		StartsAt:      req.StartsAt,
		EndsAt:        req.EndsAt,
		UsageLimit:    req.UsageLimit,
		UsedCount:     0,
		Status:        req.Status,
	}

	if err := coupon.Validate(); err != nil {
		return nil, err
	}

	if coupon.Status == "" {
		coupon.Status = "active"
	}
	if coupon.UsageType == "" {
		coupon.UsageType = "cart"
	}

	_, err := s.db.Exec(ctx, `
		INSERT INTO coupons (id, store_id, code, name, description, discount_type, discount_value,
		                    usage_type, starts_at, ends_at, usage_limit, used_count, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		coupon.ID, storeID, coupon.Code, coupon.Name, coupon.Description,
		coupon.DiscountType, coupon.DiscountValue,
		coupon.UsageType, coupon.StartsAt, coupon.EndsAt, coupon.UsageLimit, coupon.UsedCount, coupon.Status,
	)
	if err != nil {
		// Check for UNIQUE constraint violation
		if err.Error() == "unique violation" || err.Error() == "pq: duplicate key value violates unique constraint \"coupons_store_id_code_key\"" {
			return nil, fmt.Errorf("%w: %s", ErrCouponCodeTaken, req.Code)
		}
		return nil, fmt.Errorf("insert coupon: %w", err)
	}

	return coupon, nil
}

// GetCoupon retrieves a coupon by ID and store.
func (s *CouponService) GetCoupon(ctx context.Context, storeID, couponID uuid.UUID) (*models.Coupon, error) {
	var coupon models.Coupon
	err := s.db.QueryRow(ctx, `
		SELECT id, store_id, code, name, description, discount_type, discount_value,
		       usage_type, starts_at, ends_at, usage_limit, used_count, status,
		       created_at, updated_at
		FROM coupons WHERE id = $1 AND store_id = $2`,
		couponID, storeID,
	).Scan(
		&coupon.ID, &coupon.StoreID, &coupon.Code, &coupon.Name, &coupon.Description,
		&coupon.DiscountType, &coupon.DiscountValue, &coupon.UsageType,
		&coupon.StartsAt, &coupon.EndsAt, &coupon.UsageLimit, &coupon.UsedCount,
		&coupon.Status, &coupon.CreatedAt, &coupon.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCouponNotFound
		}
		return nil, fmt.Errorf("get coupon: %w", err)
	}
	return &coupon, nil
}

// GetCouponByCode retrieves a coupon by code and store.
func (s *CouponService) GetCouponByCode(ctx context.Context, storeID uuid.UUID, code string) (*models.Coupon, error) {
	var coupon models.Coupon
	err := s.db.QueryRow(ctx, `
		SELECT id, store_id, code, name, description, discount_type, discount_value,
		       usage_type, starts_at, ends_at, usage_limit, used_count, status,
		       created_at, updated_at
		FROM coupons WHERE store_id = $1 AND code = $2`,
		storeID, code,
	).Scan(
		&coupon.ID, &coupon.StoreID, &coupon.Code, &coupon.Name, &coupon.Description,
		&coupon.DiscountType, &coupon.DiscountValue, &coupon.UsageType,
		&coupon.StartsAt, &coupon.EndsAt, &coupon.UsageLimit, &coupon.UsedCount,
		&coupon.Status, &coupon.CreatedAt, &coupon.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCouponNotFound
		}
		return nil, fmt.Errorf("get coupon by code: %w", err)
	}
	return &coupon, nil
}

// ListCoupons retrieves all coupons for a store.
func (s *CouponService) ListCoupons(ctx context.Context, storeID uuid.UUID) ([]models.Coupon, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, store_id, code, name, description, discount_type, discount_value,
		       usage_type, starts_at, ends_at, usage_limit, used_count, status,
		       created_at, updated_at
		FROM coupons WHERE store_id = $1
		ORDER BY created_at DESC`,
		storeID,
	)
	if err != nil {
		return nil, fmt.Errorf("list coupons: %w", err)
	}
	defer rows.Close()

	coupons := []models.Coupon{}
	for rows.Next() {
		var coupon models.Coupon
		if err := rows.Scan(
			&coupon.ID, &coupon.StoreID, &coupon.Code, &coupon.Name, &coupon.Description,
			&coupon.DiscountType, &coupon.DiscountValue, &coupon.UsageType,
			&coupon.StartsAt, &coupon.EndsAt, &coupon.UsageLimit, &coupon.UsedCount,
			&coupon.Status, &coupon.CreatedAt, &coupon.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan coupon: %w", err)
		}
		coupons = append(coupons, coupon)
	}
	return coupons, rows.Err()
}

// UpdateCoupon updates coupon fields.
func (s *CouponService) UpdateCoupon(ctx context.Context, storeID, couponID uuid.UUID, req models.UpdateCouponRequest) (*models.Coupon, error) {
	coupon, err := s.GetCoupon(ctx, storeID, couponID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if req.Name != "" {
		coupon.Name = req.Name
	}
	if req.Description != "" {
		coupon.Description = req.Description
	}
	if req.UsageType != "" {
		coupon.UsageType = req.UsageType
	}
	if req.StartsAt != nil {
		coupon.StartsAt = req.StartsAt
	}
	if req.EndsAt != nil {
		coupon.EndsAt = req.EndsAt
	}
	if req.UsageLimit != nil {
		coupon.UsageLimit = req.UsageLimit
	}
	if req.Status != "" {
		coupon.Status = req.Status
	}

	if err := coupon.Validate(); err != nil {
		return nil, err
	}

	_, err = s.db.Exec(ctx, `
		UPDATE coupons SET name = $1, description = $2, usage_type = $3,
		                   starts_at = $4, ends_at = $5, usage_limit = $6, status = $7
		WHERE id = $8 AND store_id = $9`,
		coupon.Name, coupon.Description, coupon.UsageType,
		coupon.StartsAt, coupon.EndsAt, coupon.UsageLimit, coupon.Status,
		couponID, storeID,
	)
	if err != nil {
		return nil, fmt.Errorf("update coupon: %w", err)
	}

	return coupon, nil
}

// DeleteCoupon removes a coupon.
func (s *CouponService) DeleteCoupon(ctx context.Context, storeID, couponID uuid.UUID) error {
	result, err := s.db.Exec(ctx, `
		DELETE FROM coupons WHERE id = $1 AND store_id = $2`,
		couponID, storeID,
	)
	if err != nil {
		return fmt.Errorf("delete coupon: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrCouponNotFound
	}
	return nil
}

// RecordCouponUsage increments used_count and records usage in coupon_usage table.
func (s *CouponService) RecordCouponUsage(ctx context.Context, couponID, orderID uuid.UUID) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Insert into coupon_usage (will fail if duplicate exists).
	_, err = tx.Exec(ctx, `
		INSERT INTO coupon_usage (id, coupon_id, order_id)
		VALUES ($1, $2, $3)`,
		uuid.New(), couponID, orderID,
	)
	if err != nil {
		return fmt.Errorf("insert coupon_usage: %w", err)
	}

	// Increment used_count.
	_, err = tx.Exec(ctx, `
		UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`,
		couponID,
	)
	if err != nil {
		return fmt.Errorf("update used_count: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}
