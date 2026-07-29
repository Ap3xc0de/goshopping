package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrAccountNotFound = errors.New("account not found")
var ErrStoreNotFoundAdmin = errors.New("store not found")

// AdminService handles superadmin operations.
type AdminService struct {
	db  *pgxpool.Pool
	cfg *config.Config
}

// NewAdminService creates a new AdminService.
func NewAdminService(db *pgxpool.Pool, cfg *config.Config) *AdminService {
	return &AdminService{db: db, cfg: cfg}
}

// AdminDashboardData holds system-wide KPIs for superadmins.
type AdminDashboardData struct {
	TotalAccounts      int64   `json:"total_accounts"`
	ActiveAccounts     int64   `json:"active_accounts"`
	TotalStores        int64   `json:"total_stores"`
	ActiveStores       int64   `json:"active_stores"`
	TotalOrders        int64   `json:"total_orders"`
	TotalRevenue       float64 `json:"total_revenue"`
	NewAccountsLast30d int64   `json:"new_accounts_last_30d"`
	NewStoresLast30d   int64   `json:"new_stores_last_30d"`
}

// GetAdminDashboard returns global KPIs.
func (s *AdminService) GetAdminDashboard() (*AdminDashboardData, error) {
	ctx := context.Background()
	var d AdminDashboardData

	if err := s.db.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(CASE WHEN status='active' THEN 1 END),
		       COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)
		FROM accounts`, //nolint
	).Scan(&d.TotalAccounts, &d.ActiveAccounts, &d.NewAccountsLast30d); err != nil {
		return nil, fmt.Errorf("admin dashboard accounts: %w", err)
	}

	if err := s.db.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(CASE WHEN status='active' THEN 1 END),
		       COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)
		FROM stores`,
	).Scan(&d.TotalStores, &d.ActiveStores, &d.NewStoresLast30d); err != nil {
		return nil, fmt.Errorf("admin dashboard stores: %w", err)
	}

	if err := s.db.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(total),0) FROM orders WHERE status != 'cancelled'`,
	).Scan(&d.TotalOrders, &d.TotalRevenue); err != nil {
		return nil, fmt.Errorf("admin dashboard orders: %w", err)
	}

	return &d, nil
}

// ListAccountsResult holds a paginated list of accounts.
type ListAccountsResult struct {
	Accounts   []models.Account
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// ListAccounts returns paginated accounts.
func (s *AdminService) ListAccounts(page, perPage int, search string) (*ListAccountsResult, error) {
	ctx := context.Background()
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	conditions := []string{"1=1"}
	args := []interface{}{}
	idx := 1

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(email ILIKE $%d OR name ILIKE $%d)", idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM accounts "+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count accounts: %w", err)
	}

	args = append(args, perPage, offset)
	rows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT id, email, name, role, status, created_at, updated_at
		FROM accounts %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, idx, idx+1),
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("list accounts: %w", err)
	}
	defer rows.Close()

	accounts := []models.Account{}
	for rows.Next() {
		var a models.Account
		if err := rows.Scan(&a.ID, &a.Email, &a.Name, &a.Role, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan account: %w", err)
		}
		accounts = append(accounts, a)
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}
	return &ListAccountsResult{Accounts: accounts, Total: total, Page: page, PerPage: perPage, TotalPages: totalPages}, nil
}

// AccountDetail is an account with its associated stores.
type AccountDetail struct {
	models.Account
	Stores []models.Store `json:"stores"`
}

// GetAccount returns an account with its stores.
func (s *AdminService) GetAccount(accountID uuid.UUID) (*AccountDetail, error) {
	ctx := context.Background()
	var a models.Account
	if err := s.db.QueryRow(ctx, `
		SELECT id, email, name, role, status, created_at, updated_at
		FROM accounts WHERE id = $1`, accountID,
	).Scan(&a.ID, &a.Email, &a.Name, &a.Role, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("get account: %w", err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, account_id, name, slug, COALESCE(domain,'') as domain, status,
		       COALESCE(config,'{}') as config, created_at, updated_at
		FROM stores WHERE account_id = $1 ORDER BY created_at DESC`, accountID)
	if err != nil {
		return nil, fmt.Errorf("get account stores: %w", err)
	}
	defer rows.Close()

	stores := []models.Store{}
	for rows.Next() {
		var st models.Store
		if err := rows.Scan(&st.ID, &st.AccountID, &st.Name, &st.Slug, &st.Domain,
			&st.Status, &st.Config, &st.CreatedAt, &st.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan store: %w", err)
		}
		stores = append(stores, st)
	}
	return &AccountDetail{Account: a, Stores: stores}, nil
}

// UpdateAccountStatus updates account status (active/suspended).
func (s *AdminService) UpdateAccountStatus(accountID uuid.UUID, status string) (*models.Account, error) {
	ctx := context.Background()
	var a models.Account
	err := s.db.QueryRow(ctx, `
		UPDATE accounts SET status=$1, updated_at=NOW()
		WHERE id=$2
		RETURNING id, email, name, role, status, created_at, updated_at`,
		status, accountID,
	).Scan(&a.ID, &a.Email, &a.Name, &a.Role, &a.Status, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("update account: %w", err)
	}
	return &a, nil
}

// ListStoresResult holds paginated stores.
type ListStoresResult struct {
	Stores     []models.Store
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// ListStores returns all stores paginated.
func (s *AdminService) ListStores(page, perPage int, search string) (*ListStoresResult, error) {
	ctx := context.Background()
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	conditions := []string{"1=1"}
	args := []interface{}{}
	idx := 1

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR slug ILIKE $%d)", idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM stores "+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count stores: %w", err)
	}

	args = append(args, perPage, offset)
	rows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT id, account_id, name, slug, COALESCE(domain,'') as domain, status,
		       COALESCE(config,'{}') as config, created_at, updated_at
		FROM stores %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, idx, idx+1),
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("list stores: %w", err)
	}
	defer rows.Close()

	stores := []models.Store{}
	for rows.Next() {
		var st models.Store
		if err := rows.Scan(&st.ID, &st.AccountID, &st.Name, &st.Slug, &st.Domain,
			&st.Status, &st.Config, &st.CreatedAt, &st.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan store: %w", err)
		}
		stores = append(stores, st)
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}
	return &ListStoresResult{Stores: stores, Total: total, Page: page, PerPage: perPage, TotalPages: totalPages}, nil
}

// GetStore returns a single store by ID.
func (s *AdminService) GetStore(storeID uuid.UUID) (*models.Store, error) {
	ctx := context.Background()
	var st models.Store
	err := s.db.QueryRow(ctx, `
		SELECT id, account_id, name, slug, COALESCE(domain,'') as domain, status,
		       COALESCE(config,'{}') as config, created_at, updated_at
		FROM stores WHERE id = $1`, storeID,
	).Scan(&st.ID, &st.AccountID, &st.Name, &st.Slug, &st.Domain,
		&st.Status, &st.Config, &st.CreatedAt, &st.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrStoreNotFoundAdmin
		}
		return nil, fmt.Errorf("get store: %w", err)
	}
	return &st, nil
}

// UpdateStoreStatus updates a store's status.
func (s *AdminService) UpdateStoreStatus(storeID uuid.UUID, status string) (*models.Store, error) {
	ctx := context.Background()
	var st models.Store
	err := s.db.QueryRow(ctx, `
		UPDATE stores SET status=$1, updated_at=NOW()
		WHERE id=$2
		RETURNING id, account_id, name, slug, COALESCE(domain,'') as domain, status,
		          COALESCE(config,'{}') as config, created_at, updated_at`,
		status, storeID,
	).Scan(&st.ID, &st.AccountID, &st.Name, &st.Slug, &st.Domain,
		&st.Status, &st.Config, &st.CreatedAt, &st.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrStoreNotFoundAdmin
		}
		return nil, fmt.Errorf("update store status: %w", err)
	}
	return &st, nil
}

// AuditLogEntry represents a row from the audit_log table.
type AuditLogEntry struct {
	ID         uuid.UUID       `json:"id"`
	AccountID  *uuid.UUID      `json:"account_id"`
	StoreID    *uuid.UUID      `json:"store_id"`
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   *uuid.UUID      `json:"entity_id"`
	Details    json.RawMessage `json:"details"`
	IP         string          `json:"ip"`
	CreatedAt  time.Time       `json:"created_at"`
}

// ListAuditLogResult holds paginated audit log entries.
type ListAuditLogResult struct {
	Entries    []AuditLogEntry
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// GetAuditLog returns paginated audit log entries with optional filters.
func (s *AdminService) GetAuditLog(page, perPage int, accountID, storeID, action, from, to string) (*ListAuditLogResult, error) {
	ctx := context.Background()
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	conditions := []string{"1=1"}
	args := []interface{}{}
	idx := 1

	if accountID != "" {
		conditions = append(conditions, fmt.Sprintf("account_id = $%d", idx))
		args = append(args, accountID)
		idx++
	}
	if storeID != "" {
		conditions = append(conditions, fmt.Sprintf("store_id = $%d", idx))
		args = append(args, storeID)
		idx++
	}
	if action != "" {
		conditions = append(conditions, fmt.Sprintf("action = $%d", idx))
		args = append(args, action)
		idx++
	}
	if from != "" {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d::timestamptz", idx))
		args = append(args, from)
		idx++
	}
	if to != "" {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d::timestamptz", idx))
		args = append(args, to)
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM audit_log "+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count audit_log: %w", err)
	}

	args = append(args, perPage, offset)
	rows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT id, account_id, store_id, action,
		       COALESCE(entity_type,'') as entity_type, entity_id,
		       COALESCE(details,'{}') as details, COALESCE(ip,'') as ip, created_at
		FROM audit_log %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, idx, idx+1),
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("list audit_log: %w", err)
	}
	defer rows.Close()

	entries := []AuditLogEntry{}
	for rows.Next() {
		var e AuditLogEntry
		if err := rows.Scan(&e.ID, &e.AccountID, &e.StoreID, &e.Action, &e.EntityType,
			&e.EntityID, &e.Details, &e.IP, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan audit log: %w", err)
		}
		entries = append(entries, e)
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}
	return &ListAuditLogResult{Entries: entries, Total: total, Page: page, PerPage: perPage, TotalPages: totalPages}, nil
}

// IntegrationHealth holds the health status of an external integration.
type IntegrationHealth struct {
	Name      string `json:"name"`
	Status    string `json:"status"`
	LastCheck string `json:"last_check"`
}

// GetIntegrationsHealth returns a summary of integration statuses from the integrations table.
func (s *AdminService) GetIntegrationsHealth() ([]IntegrationHealth, error) {
	ctx := context.Background()
	rows, err := s.db.Query(ctx, `
		SELECT COALESCE(type,'unknown') as name,
		       COALESCE(status,'unknown') as status,
		       COALESCE(updated_at::text, '') as last_check
		FROM integrations
		GROUP BY 1, 2, 3
		ORDER BY 1`)
	if err != nil {
		return nil, fmt.Errorf("integrations health: %w", err)
	}
	defer rows.Close()

	result := []IntegrationHealth{}
	for rows.Next() {
		var h IntegrationHealth
		if err := rows.Scan(&h.Name, &h.Status, &h.LastCheck); err != nil {
			return nil, fmt.Errorf("scan integration: %w", err)
		}
		result = append(result, h)
	}
	return result, rows.Err()
}
