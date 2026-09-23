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
// client-side (REQ: Hierarchical Categories with Real Counts) — plus
// TotalProductCount (direct + all descendants) and tree metadata (ParentID,
// Depth, SortOrder, Path; see models.CategoryNode's doc comment).
func (s *CategoryService) ListCategoryTree(ctx context.Context, storeID uuid.UUID) ([]models.CategoryNode, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, name, slug, parent_id, sort_order
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
		var sortOrder int
		if err := rows.Scan(&id, &name, &slug, &parentID, &sortOrder); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		parentOf[id] = parentID
		nodes[id] = &models.CategoryNode{
			ID:        id,
			Name:      name,
			Slug:      slug,
			ParentID:  parentID,
			SortOrder: sortOrder,
			Children:  []models.CategoryNode{},
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

	return buildCategoryTree(ordered, nodes, parentOf), nil
}

// buildCategoryTree assembles nodes into a forest via a children-by-parent-id
// adjacency map, then recurses DOWN from the roots.
//
// The previous implementation assembled the tree by VALUE while scanning in a
// single pass ("parent.Children = append(parent.Children, *node)" /
// "tree = append(tree, *node)"): when a parent was scanned before its child
// (sort_order ASC, name ASC), the parent's copy was already placed into the
// tree (or its own parent's Children slice) before the child got appended to
// the still-live node pointer — the child was silently dropped. Building the
// adjacency map first and only THEN recursing top-down means every node's
// Children are fully resolved before that node itself is copied anywhere, so
// scan order can never lose a child.
//
// It also computes Depth, Path and TotalProductCount on the way back up, and
// is defensive against corrupted data: any node unreachable from a root
// (e.g. leftover cycle A→B→A with neither pointing at a real root) is simply
// never visited — no crash, no infinite recursion — and a `placed` guard
// stops any id from being emitted twice even if it were reachable more than
// once.
func buildCategoryTree(ordered []uuid.UUID, nodes map[uuid.UUID]*models.CategoryNode, parentOf map[uuid.UUID]*uuid.UUID) []models.CategoryNode {
	// childrenOf groups ids by their effective parent (uuid.Nil = root: true
	// roots and orphans whose parent isn't among this store's rows). `ordered`
	// is already sorted by (sort_order, name); grouping a sorted slice by key
	// preserves that order within each group, so children come out sorted too.
	childrenOf := make(map[uuid.UUID][]uuid.UUID)
	for _, id := range ordered {
		key := uuid.Nil
		if parentID := parentOf[id]; parentID != nil {
			if _, ok := nodes[*parentID]; ok {
				key = *parentID
			}
		}
		childrenOf[key] = append(childrenOf[key], id)
	}

	placed := make(map[uuid.UUID]bool, len(nodes))
	var build func(parentKey uuid.UUID, depth int, path []models.CategoryPathEntry) []models.CategoryNode
	build = func(parentKey uuid.UUID, depth int, path []models.CategoryPathEntry) []models.CategoryNode {
		ids := childrenOf[parentKey]
		result := make([]models.CategoryNode, 0, len(ids))
		for _, id := range ids {
			if placed[id] {
				continue // defensive: would only trip on already-corrupted data
			}
			placed[id] = true

			node := *nodes[id] // copy: Children/Path/Depth/TotalProductCount are filled in below
			node.Depth = depth
			node.Path = append(append([]models.CategoryPathEntry{}, path...),
				models.CategoryPathEntry{ID: node.ID, Name: node.Name, Slug: node.Slug})
			node.Children = build(id, depth+1, node.Path)

			node.TotalProductCount = node.ProductCount
			for _, child := range node.Children {
				node.TotalProductCount += child.TotalProductCount
			}

			result = append(result, node)
		}
		return result
	}
	return build(uuid.Nil, 0, nil)
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

// isDescendantOf reports whether candidateID is categoryID itself or a
// descendant of it, by walking the parent_id chain UP from candidateID. A
// category has at most one parent, so this cheap walk is equivalent to (and
// avoids) a recursive CTE. A visited set guards against looping forever if
// the stored data already contains a cycle from before this validation
// existed — that pre-existing cycle is not this call's problem to fix.
func (s *CategoryService) isDescendantOf(ctx context.Context, storeID, categoryID, candidateID uuid.UUID) (bool, error) {
	current := candidateID
	visited := make(map[uuid.UUID]bool)
	for {
		if current == categoryID {
			return true, nil
		}
		if visited[current] {
			return false, nil
		}
		visited[current] = true

		var parentID *uuid.UUID
		err := s.db.QueryRow(ctx,
			`SELECT parent_id FROM categories WHERE id = $1 AND store_id = $2`,
			current, storeID,
		).Scan(&parentID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return false, nil
			}
			return false, fmt.Errorf("walk category ancestors: %w", err)
		}
		if parentID == nil {
			return false, nil
		}
		current = *parentID
	}
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
			// Reject moving the category under one of its own descendants
			// (A→B→A cycle): the new parent must not already be a descendant
			// of the category being updated (REQ: Cycle Prevention).
			isDescendant, err := s.isDescendantOf(ctx, storeID, categoryID, *req.ParentID)
			if err != nil {
				return nil, err
			}
			if isDescendant {
				return nil, fmt.Errorf("parent category cannot be a descendant of this category")
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
