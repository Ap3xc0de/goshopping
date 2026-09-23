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

var ErrVariantNotFound = errors.New("variant not found")

// variantStatuses mirrors the product_variants.status CHECK constraint from
// migration 011 (active|inactive only — the delta spec's out_of_stock|deleted
// values do not exist in the shipped DDL).
var variantStatuses = map[string]bool{"active": true, "inactive": true}

// VariantService handles business logic for product variants (migration 011).
type VariantService struct {
	db *pgxpool.Pool
}

// NewVariantService creates a new VariantService.
func NewVariantService(db *pgxpool.Pool) *VariantService {
	return &VariantService{db: db}
}

const variantColumns = `id, store_id, product_id, sku, COALESCE(size,''), COALESCE(color,''),
	price_override, stock, status, created_at, updated_at`

func scanVariant(row pgx.Row) (models.ProductVariant, error) {
	var v models.ProductVariant
	err := row.Scan(&v.ID, &v.StoreID, &v.ProductID, &v.SKU, &v.Size, &v.Color,
		&v.PriceOverride, &v.Stock, &v.Status, &v.CreatedAt, &v.UpdatedAt)
	return v, err
}

// ListVariantsByProductIDs batch-loads every variant for a set of products in
// ONE query (avoids N+1 in the public product list path). status filters when
// non-empty; the public path passes "active". Results map product_id → its
// variants, ordered by created_at then id for deterministic serialization.
func (s *VariantService) ListVariantsByProductIDs(ctx context.Context, storeID uuid.UUID, productIDs []uuid.UUID, status string) (map[uuid.UUID][]models.ProductVariant, error) {
	byProduct := make(map[uuid.UUID][]models.ProductVariant, len(productIDs))
	if len(productIDs) == 0 {
		return byProduct, nil
	}

	query := fmt.Sprintf(`SELECT %s FROM product_variants WHERE product_id = ANY($1) AND store_id = $2`, variantColumns)
	args := []interface{}{productIDs, storeID}
	if status != "" {
		query += ` AND status = $3`
		args = append(args, status)
	}
	query += ` ORDER BY created_at ASC, id ASC`

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list variants: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var v models.ProductVariant
		if err := rows.Scan(&v.ID, &v.StoreID, &v.ProductID, &v.SKU, &v.Size, &v.Color,
			&v.PriceOverride, &v.Stock, &v.Status, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan variant: %w", err)
		}
		byProduct[v.ProductID] = append(byProduct[v.ProductID], v)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate variants: %w", err)
	}
	return byProduct, nil
}

// ListVariantsByProduct returns every variant of one product (admin view, no
// status filter).
func (s *VariantService) ListVariantsByProduct(ctx context.Context, storeID, productID uuid.UUID) ([]models.ProductVariant, error) {
	byProduct, err := s.ListVariantsByProductIDs(ctx, storeID, []uuid.UUID{productID}, "")
	if err != nil {
		return nil, err
	}
	variants := byProduct[productID]
	if variants == nil {
		variants = []models.ProductVariant{}
	}
	return variants, nil
}

// GetVariantByID returns a single variant scoped to the store (any status).
func (s *VariantService) GetVariantByID(ctx context.Context, storeID, variantID uuid.UUID) (*models.ProductVariant, error) {
	v, err := scanVariant(s.db.QueryRow(ctx, `
		SELECT `+variantColumns+` FROM product_variants
		WHERE id = $1 AND store_id = $2`, variantID, storeID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVariantNotFound
		}
		return nil, fmt.Errorf("get variant: %w", err)
	}
	return &v, nil
}

// GetActiveVariantForProduct resolves a purchasable variant: it must belong to
// that exact product, in that store, and still be active. Unknown, mismatched,
// or inactive variants all yield ErrVariantNotFound → 422 at the API boundary
// (product-variants REQ: Variant-Aware Quote).
func (s *VariantService) GetActiveVariantForProduct(ctx context.Context, storeID, variantID, productID uuid.UUID) (*models.ProductVariant, error) {
	v, err := scanVariant(s.db.QueryRow(ctx, `
		SELECT `+variantColumns+` FROM product_variants
		WHERE id = $1 AND product_id = $2 AND store_id = $3 AND status = 'active'`,
		variantID, productID, storeID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVariantNotFound
		}
		return nil, fmt.Errorf("get active variant: %w", err)
	}
	return &v, nil
}

// CreateVariant creates a variant for a product of this store. SKU is unique
// per product (DB UNIQUE(product_id, sku)); status defaults to active when
// omitted and must be active|inactive (011 CHECK).
func (s *VariantService) CreateVariant(ctx context.Context, storeID, productID uuid.UUID, req models.CreateVariantRequest) (*models.ProductVariant, error) {
	if req.SKU == "" {
		return nil, fmt.Errorf("sku is required")
	}
	if req.Stock < 0 {
		return nil, fmt.Errorf("stock must be non-negative")
	}
	status := req.Status
	if status == "" {
		status = "active"
	}
	if !variantStatuses[status] {
		return nil, fmt.Errorf("status must be active or inactive")
	}

	var productExists bool
	if err := s.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM products WHERE id = $1 AND store_id = $2 AND status != 'deleted')`,
		productID, storeID,
	).Scan(&productExists); err != nil {
		return nil, fmt.Errorf("check product: %w", err)
	}
	if !productExists {
		return nil, ErrProductNotFound
	}

	var priceOverride any
	if req.PriceOverride != nil {
		priceOverride = *req.PriceOverride
	}

	v, err := scanVariant(s.db.QueryRow(ctx, `
		INSERT INTO product_variants (store_id, product_id, sku, size, color, price_override, stock, status)
		VALUES ($1, $2, $3, NULLIF($4,''), NULLIF($5,''), $6, $7, $8)
		RETURNING `+variantColumns,
		storeID, productID, req.SKU, req.Size, req.Color, priceOverride, req.Stock, status,
	))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, fmt.Errorf("a variant with this SKU already exists for this product")
		}
		return nil, fmt.Errorf("create variant: %w", err)
	}
	return &v, nil
}

// UpdateVariant applies a partial update to a variant. Nil fields are left
// untouched.
func (s *VariantService) UpdateVariant(ctx context.Context, storeID, variantID uuid.UUID, req models.UpdateVariantRequest) (*models.ProductVariant, error) {
	cur, err := s.GetVariantByID(ctx, storeID, variantID)
	if err != nil {
		return nil, err
	}

	if req.SKU != nil {
		if *req.SKU == "" {
			return nil, fmt.Errorf("sku must not be empty")
		}
		cur.SKU = *req.SKU
	}
	if req.Size != nil {
		cur.Size = *req.Size
	}
	if req.Color != nil {
		cur.Color = *req.Color
	}
	if req.PriceOverride != nil {
		cur.PriceOverride = req.PriceOverride
	}
	if req.Stock != nil {
		if *req.Stock < 0 {
			return nil, fmt.Errorf("stock must be non-negative")
		}
		cur.Stock = *req.Stock
	}
	if req.Status != nil {
		if !variantStatuses[*req.Status] {
			return nil, fmt.Errorf("status must be active or inactive")
		}
		cur.Status = *req.Status
	}

	var priceOverride any
	if cur.PriceOverride != nil {
		priceOverride = *cur.PriceOverride
	}

	v, err := scanVariant(s.db.QueryRow(ctx, `
		UPDATE product_variants
		SET sku=$1, size=NULLIF($2,''), color=NULLIF($3,''), price_override=$4, stock=$5, status=$6, updated_at=NOW()
		WHERE id=$7 AND store_id=$8
		RETURNING `+variantColumns,
		cur.SKU, cur.Size, cur.Color, priceOverride, cur.Stock, cur.Status, variantID, storeID,
	))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, fmt.Errorf("a variant with this SKU already exists for this product")
		}
		return nil, fmt.Errorf("update variant: %w", err)
	}
	return &v, nil
}

// DeleteVariant physically deletes a variant. The 011 DDL's status CHECK only
// allows active|inactive (no 'deleted'), so soft-delete is not available;
// order lines keep working because orders.items snapshots sku/size/color.
// Deleting a variant does NOT touch product stock — variant stock is
// independent.
func (s *VariantService) DeleteVariant(ctx context.Context, storeID, variantID uuid.UUID) error {
	if _, err := s.GetVariantByID(ctx, storeID, variantID); err != nil {
		return err
	}
	tag, err := s.db.Exec(ctx,
		`DELETE FROM product_variants WHERE id = $1 AND store_id = $2`, variantID, storeID)
	if err != nil {
		return fmt.Errorf("delete variant: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrVariantNotFound
	}
	return nil
}
