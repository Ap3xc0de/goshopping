package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	marketplaceDefaultPerPage = 20
	marketplaceMaxPerPage     = 50
)

// MarketplaceStore is the public-facing view of a store (no account/owner/internal fields).
type MarketplaceStore struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Slug string    `json:"slug"`
}

// ListMarketplaceStoresResult holds a paginated list of public stores.
type ListMarketplaceStoresResult struct {
	Stores     []MarketplaceStore
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// MarketplaceProduct is the public-facing view of a product (no cost/min_stock)
// together with the store it belongs to.
type MarketplaceProduct struct {
	ID          uuid.UUID        `json:"id"`
	StoreID     uuid.UUID        `json:"store_id"`
	Name        string           `json:"name"`
	SKU         string           `json:"sku"`
	Description string           `json:"description"`
	Price       models.Money     `json:"price"`
	Stock       int              `json:"stock"`
	Category    string           `json:"category"`
	Images      json.RawMessage  `json:"images"`
	Status      string           `json:"status"`
	Store       MarketplaceStore `json:"store"`
}

// ListMarketplaceProductsResult holds a paginated list of public products.
type ListMarketplaceProductsResult struct {
	Products   []MarketplaceProduct
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// MarketplaceService serves cross-store, read-only public data.
type MarketplaceService struct {
	db *pgxpool.Pool
}

// NewMarketplaceService creates a MarketplaceService.
func NewMarketplaceService(db *pgxpool.Pool) *MarketplaceService {
	return &MarketplaceService{db: db}
}

// ListStores returns active stores ordered by name, optionally filtered by a
// case-insensitive name search.
func (s *MarketplaceService) ListStores(page, perPage int, search string) (*ListMarketplaceStoresResult, error) {
	ctx := context.Background()
	page, perPage = normalizeMarketplacePaging(page, perPage)
	offset := (page - 1) * perPage

	conditions := []string{"status = 'active'"}
	args := []interface{}{}
	idx := 1

	if search = strings.TrimSpace(search); search != "" {
		conditions = append(conditions, fmt.Sprintf(`name ILIKE $%d ESCAPE '\'`, idx))
		args = append(args, "%"+escapeLike(search)+"%")
		idx++
	}
	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM stores "+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count stores: %w", err)
	}

	args = append(args, perPage, offset)
	query := fmt.Sprintf(`
		SELECT id, name, slug
		FROM stores %s
		ORDER BY name ASC, id ASC
		LIMIT $%d OFFSET $%d`, where, idx, idx+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query stores: %w", err)
	}
	defer rows.Close()

	stores := []MarketplaceStore{}
	for rows.Next() {
		var st MarketplaceStore
		if err := rows.Scan(&st.ID, &st.Name, &st.Slug); err != nil {
			return nil, fmt.Errorf("scan store: %w", err)
		}
		stores = append(stores, st)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stores: %w", err)
	}

	return &ListMarketplaceStoresResult{
		Stores:     stores,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: marketplaceTotalPages(total, perPage),
	}, nil
}

// ListProducts returns active products of active stores ordered by name,
// optionally filtered by a case-insensitive name search and an exact category.
func (s *MarketplaceService) ListProducts(page, perPage int, search, category string) (*ListMarketplaceProductsResult, error) {
	ctx := context.Background()
	page, perPage = normalizeMarketplacePaging(page, perPage)
	offset := (page - 1) * perPage

	conditions := []string{"p.status = 'active'", "s.status = 'active'"}
	args := []interface{}{}
	idx := 1

	if search = strings.TrimSpace(search); search != "" {
		conditions = append(conditions, fmt.Sprintf(`p.name ILIKE $%d ESCAPE '\'`, idx))
		args = append(args, "%"+escapeLike(search)+"%")
		idx++
	}
	if category != "" {
		conditions = append(conditions, fmt.Sprintf("p.category = $%d", idx))
		args = append(args, category)
		idx++
	}
	where := "WHERE " + strings.Join(conditions, " AND ")
	from := "FROM products p JOIN stores s ON s.id = p.store_id "

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) "+from+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count products: %w", err)
	}

	args = append(args, perPage, offset)
	query := fmt.Sprintf(`
		SELECT p.id, p.store_id, p.name, COALESCE(p.sku,''), COALESCE(p.description,''),
		       p.price, p.stock, COALESCE(p.category,''), p.images, p.status,
		       s.id, s.name, s.slug
		%s%s
		ORDER BY p.name ASC, p.id ASC
		LIMIT $%d OFFSET $%d`, from, where, idx, idx+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	products := []MarketplaceProduct{}
	for rows.Next() {
		var p MarketplaceProduct
		if err := rows.Scan(&p.ID, &p.StoreID, &p.Name, &p.SKU, &p.Description,
			&p.Price, &p.Stock, &p.Category, &p.Images, &p.Status,
			&p.Store.ID, &p.Store.Name, &p.Store.Slug); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate products: %w", err)
	}

	return &ListMarketplaceProductsResult{
		Products:   products,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: marketplaceTotalPages(total, perPage),
	}, nil
}

// normalizeMarketplacePaging applies defaults and the per_page cap.
func normalizeMarketplacePaging(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = marketplaceDefaultPerPage
	}
	if perPage > marketplaceMaxPerPage {
		perPage = marketplaceMaxPerPage
	}
	return page, perPage
}

func marketplaceTotalPages(total int64, perPage int) int {
	return int((total + int64(perPage) - 1) / int64(perPage))
}

// escapeLike escapes LIKE wildcards so user input is matched literally.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}
