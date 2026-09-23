package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	// ErrCategoryNotFound is returned when a category does not exist in the store.
	ErrCategoryNotFound = errors.New("category not found")
	// ErrCategoryHasChildren is returned when deleting a category that still has
	// child categories (REQ: Admin Category Management → 409).
	ErrCategoryHasChildren = errors.New("category has children")
)

// CategoryService handles business logic for the hierarchical category tree
// introduced by migration 011.
type CategoryService struct {
	db *pgxpool.Pool
}

// NewCategoryService creates a new CategoryService.
func NewCategoryService(db *pgxpool.Pool) *CategoryService {
	return &CategoryService{db: db}
}

// ListCategoryTree returns the store's category tree (parents nesting their
// children). Every node carries ProductCount — the REAL number of active
// products assigned DIRECTLY to that node, computed in SQL (GROUP BY), never
// client-side (REQ: Hierarchical Categories with Real Counts).
func (s *CategoryService) ListCategoryTree(ctx context.Context, storeID uuid.UUID) ([]models.CategoryNode, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, name, slug, parent_id
		FROM categories
		WHERE store_id = $1
		ORDER BY sort_order ASC, name ASC`, storeID)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	nodes := make(map[uuid.UUID]*models.CategoryNode)
	parentOf := make(map[uuid.UUID]*uuid.UUID)
	var ordered []uuid.UUID // keeps the sort_order/name scan order
	for rows.Next() {
		var id uuid.UUID
		var name, slug string
		var parentID *uuid.UUID
		if err := rows.Scan(&id, &name, &slug, &parentID); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		parentOf[id] = parentID
		nodes[id] = &models.CategoryNode{
			ID:       id,
			Name:     name,
			Slug:     slug,
			Children: []models.CategoryNode{},
		}
		ordered = append(ordered, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate categories: %w", err)
	}

	// Counts: active products only, direct assignments only (GROUP BY per node).
	countRows, err := s.db.Query(ctx, `
		SELECT category_id, COUNT(*)
		FROM products
		WHERE store_id = $1 AND category_id IS NOT NULL AND status = 'active'
		GROUP BY category_id`, storeID)
	if err != nil {
		return nil, fmt.Errorf("count category products: %w", err)
	}
	defer countRows.Close()
	for countRows.Next() {
		var categoryID uuid.UUID
		var count int
		if err := countRows.Scan(&categoryID, &count); err != nil {
			return nil, fmt.Errorf("scan category count: %w", err)
		}
		if node, ok := nodes[categoryID]; ok {
			node.ProductCount = count
		}
	}
	if err := countRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate category counts: %w", err)
	}

	// Assemble the tree in scan order. Orphans (parent missing from this store's
	// rows) are defensively promoted to roots.
	tree := []models.CategoryNode{}
	for _, id := range ordered {
		node := nodes[id]
		if parentID := parentOf[id]; parentID != nil {
			if parent, ok := nodes[*parentID]; ok {
				parent.Children = append(parent.Children, *node)
				continue
			}
		}
		tree = append(tree, *node)
	}
	return tree, nil
}

// ListCategories returns the store's categories as a flat list (admin view),
// ordered by sort_order then name.
func (s *CategoryService) ListCategories(ctx context.Context, storeID uuid.UUID) ([]models.Category, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, store_id, name, slug, parent_id, sort_order, created_at, updated_at
		FROM categories
		WHERE store_id = $1
		ORDER BY sort_order ASC, name ASC`, storeID)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.StoreID, &c.Name, &c.Slug, &c.ParentID, &c.SortOrder, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		categories = append(categories, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate categories: %w", err)
	}
	return categories, nil
}

// GetCategory returns a single category scoped to the store (service-internal
// seam; handlers use the CRUD methods).
func (s *CategoryService) GetCategory(ctx context.Context, storeID, categoryID uuid.UUID) (*models.Category, error) {
	var c models.Category
	err := s.db.QueryRow(ctx, `
		SELECT id, store_id, name, slug, parent_id, sort_order, created_at, updated_at
		FROM categories
		WHERE id = $1 AND store_id = $2`,
		categoryID, storeID,
	).Scan(&c.ID, &c.StoreID, &c.Name, &c.Slug, &c.ParentID, &c.SortOrder, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCategoryNotFound
		}
		return nil, fmt.Errorf("get category: %w", err)
	}
	return &c, nil
}

// parentExistsInStore checks that parentID (when non-nil) refers to a category
// of the same store.
func (s *CategoryService) parentExistsInStore(ctx context.Context, storeID, parentID uuid.UUID) (bool, error) {
	if parentID == uuid.Nil {
		return false, nil
	}
	var exists bool
	if err := s.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1 AND store_id = $2)`,
		parentID, storeID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check parent category: %w", err)
	}
	return exists, nil
}

// CreateCategory creates a category under the optionally provided parent.
// The slug is generated from the name and kept unique per store.
func (s *CategoryService) CreateCategory(ctx context.Context, storeID uuid.UUID, req models.CreateCategoryRequest) (*models.Category, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if req.ParentID != nil {
		exists, err := s.parentExistsInStore(ctx, storeID, *req.ParentID)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("parent category not found")
		}
	}

	slug, err := s.uniqueSlug(ctx, storeID, name)
	if err != nil {
		return nil, err
	}

	var c models.Category
	err = s.db.QueryRow(ctx, `
		INSERT INTO categories (store_id, name, slug, parent_id, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, store_id, name, slug, parent_id, sort_order, created_at, updated_at`,
		storeID, name, slug, req.ParentID, req.SortOrder,
	).Scan(&c.ID, &c.StoreID, &c.Name, &c.Slug, &c.ParentID, &c.SortOrder, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create category: %w", err)
	}
	return &c, nil
}

// UpdateCategory applies a partial update. Renames keep the original slug
// (stable public reference).
func (s *CategoryService) UpdateCategory(ctx context.Context, storeID, categoryID uuid.UUID, req models.UpdateCategoryRequest) (*models.Category, error) {
	cur, err := s.GetCategory(ctx, storeID, categoryID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, fmt.Errorf("name must not be empty")
		}
		cur.Name = name
	}
	if req.SortOrder != nil {
		cur.SortOrder = *req.SortOrder
	}
	if req.ParentID != nil && *req.ParentID != categoryID {
		if *req.ParentID == uuid.Nil {
			cur.ParentID = nil
		} else {
			exists, err := s.parentExistsInStore(ctx, storeID, *req.ParentID)
			if err != nil {
				return nil, err
			}
			if !exists {
				return nil, fmt.Errorf("parent category not found")
			}
			cur.ParentID = req.ParentID
		}
	} else if req.ParentID != nil && *req.ParentID == categoryID {
		return nil, fmt.Errorf("category cannot be its own parent")
	}

	var updated models.Category
	err = s.db.QueryRow(ctx, `
		UPDATE categories
		SET name = $1, parent_id = $2, sort_order = $3, updated_at = NOW()
		WHERE id = $4 AND store_id = $5
		RETURNING id, store_id, name, slug, parent_id, sort_order, created_at, updated_at`,
		cur.Name, cur.ParentID, cur.SortOrder, categoryID, storeID,
	).Scan(&updated.ID, &updated.StoreID, &updated.Name, &updated.Slug, &updated.ParentID, &updated.SortOrder, &updated.CreatedAt, &updated.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update category: %w", err)
	}
	return &updated, nil
}

// DeleteCategory hard-deletes a category. Deleting a parent that still has
// children returns ErrCategoryHasChildren (handlers map it to 409).
func (s *CategoryService) DeleteCategory(ctx context.Context, storeID, categoryID uuid.UUID) error {
	if _, err := s.GetCategory(ctx, storeID, categoryID); err != nil {
		return err
	}

	var childCount int
	if err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM categories WHERE parent_id = $1 AND store_id = $2`,
		categoryID, storeID,
	).Scan(&childCount); err != nil {
		return fmt.Errorf("count category children: %w", err)
	}
	if childCount > 0 {
		return ErrCategoryHasChildren
	}

	tag, err := s.db.Exec(ctx,
		`DELETE FROM categories WHERE id = $1 AND store_id = $2`, categoryID, storeID)
	if err != nil {
		return fmt.Errorf("delete category: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrCategoryNotFound
	}
	return nil
}

// slugify derives a URL-safe slug from a category name: lowercase, alphanumeric
// runs joined by single dashes, other punctuation dropped.
func slugify(name string) string {
	var b strings.Builder
	lastDash := false
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
			lastDash = false
		case unicode.IsSpace(r), r == '-', r == '_':
			if !lastDash && b.Len() > 0 {
				b.WriteRune('-')
				lastDash = true
			}
		}
	}
	slug := strings.Trim(b.String(), "-")
	if slug == "" {
		slug = "category"
	}
	return slug
}

// uniqueSlug returns slugify(name), appending a short random suffix when the
// slug is already taken within the store (UNIQUE(store_id, slug)).
func (s *CategoryService) uniqueSlug(ctx context.Context, storeID uuid.UUID, name string) (string, error) {
	base := slugify(name)
	slug := base
	for range 5 {
		var exists bool
		if err := s.db.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM categories WHERE store_id = $1 AND slug = $2)`,
			storeID, slug,
		).Scan(&exists); err != nil {
			return "", fmt.Errorf("check category slug: %w", err)
		}
		if !exists {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%s", base, uuid.New().String()[:6])
	}
	return "", fmt.Errorf("could not generate a unique slug for %q", name)
}
