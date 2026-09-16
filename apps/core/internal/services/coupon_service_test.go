package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/database"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Helper: setup test DB and service
func setupCouponServiceTest(t *testing.T) (*CouponService, *pgxpool.Pool, uuid.UUID) {
	t.Helper()

	// Get test DB connection
	db := setupTestDB(t)

	// A store needs a real parent account: stores.account_id is a foreign key,
	// so a random UUID here fails with stores_account_id_fkey.
	storeID := uuid.New()
	ctx := context.Background()

	var accountID uuid.UUID
	err := db.QueryRow(ctx, `
		INSERT INTO accounts (email, password_hash, name, role, status)
		VALUES ($1, 'x', 'Coupon Test Account', 'owner', 'active')
		RETURNING id`,
		fmt.Sprintf("coupon-test-%s@example.test", storeID),
	).Scan(&accountID)
	if err != nil {
		t.Fatalf("failed to create test account: %v", err)
	}

	// Slug is derived from storeID so repeated runs cannot collide on it.
	_, err = db.Exec(ctx, `
		INSERT INTO stores (id, account_id, name, slug, status)
		VALUES ($1, $2, 'Test Store', $3, 'active')`,
		storeID, accountID, fmt.Sprintf("test-store-%s", storeID),
	)
	if err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}

	svc := NewCouponService(db)
	return svc, db, storeID
}

// setupTestDB creates a connection pool to test database
func setupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	cfg := &config.Config{
		DBHost:     os.Getenv("DB_HOST"),
		DBPort:     os.Getenv("DB_PORT"),
		DBUser:     os.Getenv("DB_USER"),
		DBPassword: os.Getenv("DB_PASSWORD"),
		DBName:     os.Getenv("DB_NAME"),
		DBSSLMode:  "disable",
	}

	if cfg.DBHost == "" {
		t.Skip("DB_HOST env var not set, skipping integration test")
	}

	db := database.Connect(cfg)

	// Run migrations
	database.RunMigrations(cfg)

	return db
}

func TestCouponServiceCreateCoupon(t *testing.T) {
	svc, _, storeID := setupCouponServiceTest(t)

	tests := []struct {
		name    string
		req     models.CreateCouponRequest
		wantErr bool
	}{
		{
			name: "valid coupon creation",
			req: models.CreateCouponRequest{
				Code:          "SUMMER2024",
				Name:          "Summer Sale",
				Description:   "20% off summer items",
				DiscountType:  "percentage",
				DiscountValue: models.NewMoney(20),
				UsageType:     "cart",
				Status:        "active",
			},
			wantErr: false,
		},
		{
			name: "duplicate code should fail",
			req: models.CreateCouponRequest{
				Code:          "SUMMER2024",
				Name:          "Another",
				DiscountType:  "percentage",
				DiscountValue: models.NewMoney(10),
				UsageType:     "cart",
				Status:        "active",
			},
			wantErr: true,
		},
		{
			name: "invalid discount value",
			req: models.CreateCouponRequest{
				Code:          "INVALID",
				Name:          "Bad",
				DiscountType:  "percentage",
				DiscountValue: models.NewMoney(150), // > 100%
				UsageType:     "cart",
				Status:        "active",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			coupon, err := svc.CreateCoupon(context.Background(), storeID, tt.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateCoupon() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err == nil && (coupon == nil || coupon.Code != tt.req.Code) {
				t.Errorf("CreateCoupon() returned nil or wrong coupon")
			}
		})
	}
}

func TestCouponServiceGetCouponByCode(t *testing.T) {
	svc, _, storeID := setupCouponServiceTest(t)

	// Create a coupon
	req := models.CreateCouponRequest{
		Code:          "TEST123",
		Name:          "Test",
		DiscountType:  "percentage",
		DiscountValue: models.NewMoney(10),
		UsageType:     "cart",
		Status:        "active",
	}
	created, _ := svc.CreateCoupon(context.Background(), storeID, req)

	tests := []struct {
		name    string
		code    string
		wantErr bool
		wantID  *uuid.UUID
	}{
		{
			name:    "existing coupon",
			code:    "TEST123",
			wantErr: false,
			wantID:  &created.ID,
		},
		{
			name:    "non-existing coupon",
			code:    "NOTFOUND",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			coupon, err := svc.GetCouponByCode(context.Background(), storeID, tt.code)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetCouponByCode() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err == nil && tt.wantID != nil && coupon.ID != *tt.wantID {
				t.Errorf("GetCouponByCode() returned wrong coupon")
			}
		})
	}
}

func TestCouponServiceGetCoupon(t *testing.T) {
	svc, _, storeID := setupCouponServiceTest(t)

	req := models.CreateCouponRequest{
		Code:          "GET-TEST",
		Name:          "Get Test",
		DiscountType:  "fixed",
		DiscountValue: models.NewMoney(5000),
		UsageType:     "cart",
		Status:        "active",
	}
	created, _ := svc.CreateCoupon(context.Background(), storeID, req)

	coupon, err := svc.GetCoupon(context.Background(), storeID, created.ID)
	if err != nil {
		t.Fatalf("GetCoupon() error = %v", err)
	}
	if coupon.ID != created.ID || coupon.Code != "GET-TEST" {
		t.Errorf("GetCoupon() returned wrong coupon")
	}
}

func TestCouponServiceListCoupons(t *testing.T) {
	svc, _, storeID := setupCouponServiceTest(t)

	// Create multiple coupons
	for i := 0; i < 3; i++ {
		req := models.CreateCouponRequest{
			Code:          fmt.Sprintf("COUPON-%d", i),
			Name:          fmt.Sprintf("Coupon %d", i),
			DiscountType:  "percentage",
			DiscountValue: models.NewMoney(10),
			UsageType:     "cart",
			Status:        "active",
		}
		svc.CreateCoupon(context.Background(), storeID, req)
	}

	coupons, err := svc.ListCoupons(context.Background(), storeID)
	if err != nil {
		t.Fatalf("ListCoupons() error = %v", err)
	}
	if len(coupons) != 3 {
		t.Errorf("ListCoupons() returned %d coupons, want 3", len(coupons))
	}
}

func TestCouponServiceRecordUsage(t *testing.T) {
	svc, db, storeID := setupCouponServiceTest(t)

	// Create coupon and order
	req := models.CreateCouponRequest{
		Code:          "USAGE-TEST",
		Name:          "Usage",
		DiscountType:  "percentage",
		DiscountValue: models.NewMoney(10),
		UsageType:     "cart",
		UsageLimit:    ptrInt(1),
		Status:        "active",
	}
	coupon, _ := svc.CreateCoupon(context.Background(), storeID, req)

	// coupon_usage.order_id is a foreign key to orders, so the order has to
	// exist: a bare uuid.New() fails with coupon_usage_order_id_fkey.
	var orderID uuid.UUID
	if err := db.QueryRow(context.Background(), `
		INSERT INTO orders (store_id, status, items, subtotal, tax, total, payment_method, notes)
		VALUES ($1, 'pending', '[]'::jsonb, 0, 0, 0, 'cash', '')
		RETURNING id`,
		storeID,
	).Scan(&orderID); err != nil {
		t.Fatalf("failed to create test order: %v", err)
	}

	// Record usage
	err := svc.RecordCouponUsage(context.Background(), coupon.ID, orderID)
	if err != nil {
		t.Fatalf("RecordCouponUsage() error = %v", err)
	}

	// Verify used_count incremented
	updated, _ := svc.GetCoupon(context.Background(), storeID, coupon.ID)
	if updated.UsedCount != 1 {
		t.Errorf("used_count = %d, want 1", updated.UsedCount)
	}

	// Duplicate usage should fail
	err = svc.RecordCouponUsage(context.Background(), coupon.ID, orderID)
	if err == nil || !errors.Is(err, pgx.ErrNoRows) {
		// Expected: UNIQUE constraint violation
	}
}
