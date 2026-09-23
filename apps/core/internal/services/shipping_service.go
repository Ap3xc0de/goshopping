package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	// ErrShippingZoneNotFound is returned when a zone does not exist in the store.
	ErrShippingZoneNotFound = errors.New("shipping zone not found")
	// ErrShippingMethodNotFound is returned when a method does not exist, does
	// not belong to the store, or (for the public/quote path) is not active.
	ErrShippingMethodNotFound = errors.New("shipping method not found")
)

// ShippingService handles business logic for shipping zones and methods
// (migration 011). Zone→address mapping is deferred (design decision 2); v1
// buyers pick a method by its store-unique code.
type ShippingService struct {
	db *pgxpool.Pool
}

// NewShippingService creates a new ShippingService.
func NewShippingService(db *pgxpool.Pool) *ShippingService {
	return &ShippingService{db: db}
}

// MethodWithZone pairs a method with its zone's display name — the shape the
// public handler maps into PublicShippingMethod.
type MethodWithZone struct {
	Method   models.ShippingMethod
	ZoneName string
}

// ListActiveMethods returns every active method across all zones, ordered by
// zone sort_order then method name (shipping-zones REQ: List Public Methods).
// Inactive methods are excluded.
func (s *ShippingService) ListActiveMethods(ctx context.Context, storeID uuid.UUID) ([]MethodWithZone, error) {
	rows, err := s.db.Query(ctx, `
		SELECT m.id, m.store_id, m.zone_id, m.code, m.name, m.base_price, m.weight_rate,
		       m.active, m.created_at, m.updated_at, z.name
		FROM shipping_methods m
		JOIN shipping_zones z ON z.id = m.zone_id
		WHERE m.store_id = $1 AND m.active = true
		ORDER BY z.sort_order ASC, z.name ASC, m.name ASC`, storeID)
	if err != nil {
		return nil, fmt.Errorf("list active shipping methods: %w", err)
	}
	defer rows.Close()

	methods := []MethodWithZone{}
	for rows.Next() {
		var mw MethodWithZone
		if err := rows.Scan(&mw.Method.ID, &mw.Method.StoreID, &mw.Method.ZoneID, &mw.Method.Code,
			&mw.Method.Name, &mw.Method.BasePrice, &mw.Method.WeightRate, &mw.Method.Active,
			&mw.Method.CreatedAt, &mw.Method.UpdatedAt, &mw.ZoneName); err != nil {
			return nil, fmt.Errorf("scan shipping method: %w", err)
		}
		methods = append(methods, mw)
	}
	return methods, rows.Err()
}

// GetActiveMethodByCode resolves a purchasable method: it must belong to this
// store and still be active. Unknown/inactive/non-store codes all yield
// ErrShippingMethodNotFound → 422 at the API boundary (shipping-zones REQ:
// Quote Carrier Cost).
func (s *ShippingService) GetActiveMethodByCode(ctx context.Context, storeID uuid.UUID, code string) (*models.ShippingMethod, error) {
	var m models.ShippingMethod
	err := s.db.QueryRow(ctx, `
		SELECT id, store_id, zone_id, code, name, base_price, weight_rate, active, created_at, updated_at
		FROM shipping_methods
		WHERE store_id = $1 AND code = $2 AND active = true`, storeID, code,
	).Scan(&m.ID, &m.StoreID, &m.ZoneID, &m.Code, &m.Name, &m.BasePrice, &m.WeightRate, &m.Active, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrShippingMethodNotFound
		}
		return nil, fmt.Errorf("get shipping method: %w", err)
	}
	return &m, nil
}

// ── Admin CRUD (design: "minimal, no admin UI this change") ─────────────────

// ZoneWithMethods is a zone plus its methods — the admin list shape (any
// status, not just active).
type ZoneWithMethods struct {
	models.ShippingZone
	Methods []models.ShippingMethod `json:"methods"`
}

// ListZonesWithMethods returns every zone for the store with its methods nested.
func (s *ShippingService) ListZonesWithMethods(ctx context.Context, storeID uuid.UUID) ([]ZoneWithMethods, error) {
	zoneRows, err := s.db.Query(ctx, `
		SELECT id, store_id, name, sort_order, created_at, updated_at
		FROM shipping_zones WHERE store_id = $1
		ORDER BY sort_order ASC, name ASC`, storeID)
	if err != nil {
		return nil, fmt.Errorf("list shipping zones: %w", err)
	}
	defer zoneRows.Close()

	zones := []ZoneWithMethods{}
	index := map[uuid.UUID]int{}
	for zoneRows.Next() {
		var z models.ShippingZone
		if err := zoneRows.Scan(&z.ID, &z.StoreID, &z.Name, &z.SortOrder, &z.CreatedAt, &z.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan shipping zone: %w", err)
		}
		index[z.ID] = len(zones)
		zones = append(zones, ZoneWithMethods{ShippingZone: z, Methods: []models.ShippingMethod{}})
	}
	if err := zoneRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate shipping zones: %w", err)
	}

	methodRows, err := s.db.Query(ctx, `
		SELECT id, store_id, zone_id, code, name, base_price, weight_rate, active, created_at, updated_at
		FROM shipping_methods WHERE store_id = $1
		ORDER BY name ASC`, storeID)
	if err != nil {
		return nil, fmt.Errorf("list shipping methods: %w", err)
	}
	defer methodRows.Close()

	for methodRows.Next() {
		var m models.ShippingMethod
		if err := methodRows.Scan(&m.ID, &m.StoreID, &m.ZoneID, &m.Code, &m.Name, &m.BasePrice,
			&m.WeightRate, &m.Active, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan shipping method: %w", err)
		}
		if i, ok := index[m.ZoneID]; ok {
			zones[i].Methods = append(zones[i].Methods, m)
		}
	}
	return zones, methodRows.Err()
}

// CreateZone creates a shipping zone for the store.
func (s *ShippingService) CreateZone(ctx context.Context, storeID uuid.UUID, req models.CreateShippingZoneRequest) (*models.ShippingZone, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("name is required")
	}

	var z models.ShippingZone
	err := s.db.QueryRow(ctx, `
		INSERT INTO shipping_zones (store_id, name, sort_order)
		VALUES ($1, $2, $3)
		RETURNING id, store_id, name, sort_order, created_at, updated_at`,
		storeID, req.Name, req.SortOrder,
	).Scan(&z.ID, &z.StoreID, &z.Name, &z.SortOrder, &z.CreatedAt, &z.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create shipping zone: %w", err)
	}
	return &z, nil
}

// zoneExistsInStore checks a zone belongs to the store (defense in depth for
// CreateMethod's URL-provided zoneId).
func (s *ShippingService) zoneExistsInStore(ctx context.Context, storeID, zoneID uuid.UUID) (bool, error) {
	var exists bool
	if err := s.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM shipping_zones WHERE id = $1 AND store_id = $2)`,
		zoneID, storeID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check shipping zone: %w", err)
	}
	return exists, nil
}

// CreateMethod creates a method under the given zone. Code is unique per
// store (DB UNIQUE(store_id, code)).
func (s *ShippingService) CreateMethod(ctx context.Context, storeID, zoneID uuid.UUID, req models.CreateShippingMethodRequest) (*models.ShippingMethod, error) {
	if req.Code == "" || req.Name == "" {
		return nil, fmt.Errorf("code and name are required")
	}
	exists, err := s.zoneExistsInStore(ctx, storeID, zoneID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrShippingZoneNotFound
	}
	active := true
	if req.Active != nil {
		active = *req.Active
	}

	var m models.ShippingMethod
	err = s.db.QueryRow(ctx, `
		INSERT INTO shipping_methods (store_id, zone_id, code, name, base_price, weight_rate, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, store_id, zone_id, code, name, base_price, weight_rate, active, created_at, updated_at`,
		storeID, zoneID, req.Code, req.Name, req.BasePrice, req.WeightRate, active,
	).Scan(&m.ID, &m.StoreID, &m.ZoneID, &m.Code, &m.Name, &m.BasePrice, &m.WeightRate, &m.Active, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, fmt.Errorf("a shipping method with this code already exists for this store")
		}
		return nil, fmt.Errorf("create shipping method: %w", err)
	}
	return &m, nil
}

// GetMethodByID returns a method scoped to the store (service-internal seam;
// handlers use it to enforce the URL's zone/method tree).
func (s *ShippingService) GetMethodByID(ctx context.Context, storeID, methodID uuid.UUID) (*models.ShippingMethod, error) {
	var m models.ShippingMethod
	err := s.db.QueryRow(ctx, `
		SELECT id, store_id, zone_id, code, name, base_price, weight_rate, active, created_at, updated_at
		FROM shipping_methods WHERE id = $1 AND store_id = $2`, methodID, storeID,
	).Scan(&m.ID, &m.StoreID, &m.ZoneID, &m.Code, &m.Name, &m.BasePrice, &m.WeightRate, &m.Active, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrShippingMethodNotFound
		}
		return nil, fmt.Errorf("get shipping method: %w", err)
	}
	return &m, nil
}

// UpdateMethod applies a partial update. Nil fields are left untouched. Code
// is immutable — quotes/orders may already reference it.
func (s *ShippingService) UpdateMethod(ctx context.Context, storeID, methodID uuid.UUID, req models.UpdateShippingMethodRequest) (*models.ShippingMethod, error) {
	cur, err := s.GetMethodByID(ctx, storeID, methodID)
	if err != nil {
		return nil, err
	}
	if req.Name != nil {
		if *req.Name == "" {
			return nil, fmt.Errorf("name must not be empty")
		}
		cur.Name = *req.Name
	}
	if req.BasePrice != nil {
		cur.BasePrice = *req.BasePrice
	}
	if req.WeightRate != nil {
		cur.WeightRate = *req.WeightRate
	}
	if req.Active != nil {
		cur.Active = *req.Active
	}

	var updated models.ShippingMethod
	err = s.db.QueryRow(ctx, `
		UPDATE shipping_methods
		SET name=$1, base_price=$2, weight_rate=$3, active=$4, updated_at=NOW()
		WHERE id=$5 AND store_id=$6
		RETURNING id, store_id, zone_id, code, name, base_price, weight_rate, active, created_at, updated_at`,
		cur.Name, cur.BasePrice, cur.WeightRate, cur.Active, methodID, storeID,
	).Scan(&updated.ID, &updated.StoreID, &updated.ZoneID, &updated.Code, &updated.Name,
		&updated.BasePrice, &updated.WeightRate, &updated.Active, &updated.CreatedAt, &updated.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update shipping method: %w", err)
	}
	return &updated, nil
}

// DeleteMethod hard-deletes a method.
func (s *ShippingService) DeleteMethod(ctx context.Context, storeID, methodID uuid.UUID) error {
	if _, err := s.GetMethodByID(ctx, storeID, methodID); err != nil {
		return err
	}
	tag, err := s.db.Exec(ctx, `DELETE FROM shipping_methods WHERE id = $1 AND store_id = $2`, methodID, storeID)
	if err != nil {
		return fmt.Errorf("delete shipping method: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrShippingMethodNotFound
	}
	return nil
}
