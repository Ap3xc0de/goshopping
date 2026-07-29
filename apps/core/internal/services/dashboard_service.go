package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── Types matching the admin frontend contracts ──────────────────────────────

type DashboardRecentOrder struct {
	ID           string  `json:"id"`
	OrderNumber  string  `json:"order_number"`
	CustomerName string  `json:"customer_name"`
	Status       string  `json:"status"`
	Total        float64 `json:"total"`
}

type DashboardLowStockProduct struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Stock    int    `json:"stock"`
	MinStock int    `json:"min_stock"`
}

type DashboardSalesByDay struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int64   `json:"orders"`
}

// DashboardMetrics is the shape the admin frontend expects at GET /dashboard.
type DashboardMetrics struct {
	SalesToday       float64                    `json:"sales_today"`
	SalesMonth       float64                    `json:"sales_month"`
	SalesPrevMonth   float64                    `json:"sales_prev_month"`
	PendingOrders    int64                      `json:"pending_orders"`
	LowStockCount    int64                      `json:"low_stock_count"`
	RecentOrders     []DashboardRecentOrder     `json:"recent_orders"`
	LowStockProducts []DashboardLowStockProduct `json:"low_stock_products"`
	SalesByDay       []DashboardSalesByDay      `json:"sales_by_day"`
}

// ReportsSalesRow is a single day bucket in the sales report.
type ReportsSalesRow struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int64   `json:"orders"`
}

// ReportsSales is the shape the admin frontend expects at GET /reports/sales.
type ReportsSales struct {
	TotalRevenue  float64           `json:"total_revenue"`
	TotalOrders   int64             `json:"total_orders"`
	AvgOrderValue float64           `json:"avg_order_value"`
	ByDay         []ReportsSalesRow `json:"by_day"`
}

// ReportsTopProduct is an entry in the products report.
type ReportsTopProduct struct {
	ProductID    string  `json:"product_id"`
	ProductName  string  `json:"product_name"`
	QuantitySold int64   `json:"quantity_sold"`
	Revenue      float64 `json:"revenue"`
}

// ReportsProducts is the shape the admin frontend expects at GET /reports/products.
type ReportsProducts struct {
	TopProducts []ReportsTopProduct `json:"top_products"`
}

// ReportsTopCustomer is an entry in the customers report.
type ReportsTopCustomer struct {
	CustomerID    string  `json:"customer_id"`
	CustomerName  string  `json:"customer_name"`
	OrdersCount   int64   `json:"orders_count"`
	TotalSpent    float64 `json:"total_spent"`
	AvgOrderValue float64 `json:"avg_order_value"`
}

// ReportsCustomers is the shape the admin frontend expects at GET /reports/customers.
type ReportsCustomers struct {
	TopCustomers []ReportsTopCustomer `json:"top_customers"`
}

// DashboardService aggregates analytics data for a store.
type DashboardService struct {
	db  *pgxpool.Pool
	cfg *config.Config
}

// NewDashboardService creates a new DashboardService.
func NewDashboardService(db *pgxpool.Pool, cfg *config.Config) *DashboardService {
	return &DashboardService{db: db, cfg: cfg}
}

// GetDashboard returns the KPIs the admin frontend expects.
func (s *DashboardService) GetDashboard(storeID uuid.UUID) (*DashboardMetrics, error) {
	ctx := context.Background()
	var d DashboardMetrics

	now := time.Now()
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	prevMonthStart := thisMonthStart.AddDate(0, -1, 0)
	nextMonthStart := thisMonthStart.AddDate(0, 1, 0)
	sevenDaysAgo := now.AddDate(0, 0, -6)

	// KPIs: sales today, this month, prev month, pending orders
	if err := s.db.QueryRow(ctx, `
		SELECT
		  COALESCE(SUM(CASE WHEN status != 'cancelled' AND created_at >= CURRENT_DATE THEN total ELSE 0 END), 0),
		  COALESCE(SUM(CASE WHEN status != 'cancelled' AND created_at >= $2 AND created_at < $3 THEN total ELSE 0 END), 0),
		  COALESCE(SUM(CASE WHEN status != 'cancelled' AND created_at >= $4 AND created_at < $2 THEN total ELSE 0 END), 0),
		  COUNT(CASE WHEN status = 'pending' THEN 1 END)
		FROM orders WHERE store_id = $1`,
		storeID, thisMonthStart, nextMonthStart, prevMonthStart,
	).Scan(&d.SalesToday, &d.SalesMonth, &d.SalesPrevMonth, &d.PendingOrders); err != nil {
		return nil, fmt.Errorf("dashboard kpis: %w", err)
	}

	// Low stock count
	if err := s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM products
		WHERE store_id = $1 AND status != 'deleted' AND min_stock > 0 AND stock <= min_stock`,
		storeID,
	).Scan(&d.LowStockCount); err != nil {
		return nil, fmt.Errorf("dashboard low stock count: %w", err)
	}

	// Recent orders (last 5)
	recentRows, err := s.db.Query(ctx, `
		SELECT o.id::text,
		       UPPER(SUBSTRING(o.id::text, 1, 8)) AS order_number,
		       COALESCE(c.name, 'Anónimo') AS customer_name,
		       o.status, o.total
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id
		WHERE o.store_id = $1
		ORDER BY o.created_at DESC LIMIT 5`,
		storeID,
	)
	if err != nil {
		return nil, fmt.Errorf("dashboard recent orders: %w", err)
	}
	defer recentRows.Close()
	d.RecentOrders = []DashboardRecentOrder{}
	for recentRows.Next() {
		var r DashboardRecentOrder
		if err := recentRows.Scan(&r.ID, &r.OrderNumber, &r.CustomerName, &r.Status, &r.Total); err != nil {
			return nil, fmt.Errorf("scan recent order: %w", err)
		}
		d.RecentOrders = append(d.RecentOrders, r)
	}
	if err := recentRows.Err(); err != nil {
		return nil, err
	}

	// Low stock products (up to 10)
	lsRows, err := s.db.Query(ctx, `
		SELECT id::text, name, stock, min_stock FROM products
		WHERE store_id = $1 AND status != 'deleted' AND min_stock > 0 AND stock <= min_stock
		ORDER BY stock ASC LIMIT 10`,
		storeID,
	)
	if err != nil {
		return nil, fmt.Errorf("dashboard low stock products: %w", err)
	}
	defer lsRows.Close()
	d.LowStockProducts = []DashboardLowStockProduct{}
	for lsRows.Next() {
		var p DashboardLowStockProduct
		if err := lsRows.Scan(&p.ID, &p.Name, &p.Stock, &p.MinStock); err != nil {
			return nil, fmt.Errorf("scan low stock product: %w", err)
		}
		d.LowStockProducts = append(d.LowStockProducts, p)
	}
	if err := lsRows.Err(); err != nil {
		return nil, err
	}

	// Sales by day (last 7 days)
	dayRows, err := s.db.Query(ctx, `
		SELECT created_at::date::text AS day,
		       COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS revenue,
		       COUNT(*) AS orders
		FROM orders
		WHERE store_id = $1 AND created_at >= $2::date
		GROUP BY 1 ORDER BY 1 ASC`,
		storeID, sevenDaysAgo.Format("2006-01-02"),
	)
	if err != nil {
		return nil, fmt.Errorf("dashboard sales by day: %w", err)
	}
	defer dayRows.Close()
	d.SalesByDay = []DashboardSalesByDay{}
	for dayRows.Next() {
		var row DashboardSalesByDay
		if err := dayRows.Scan(&row.Date, &row.Revenue, &row.Orders); err != nil {
			return nil, fmt.Errorf("scan sales by day: %w", err)
		}
		d.SalesByDay = append(d.SalesByDay, row)
	}
	return &d, dayRows.Err()
}

// ─── Reports ──────────────────────────────────────────────────────────────────

func defaultDateRange(from, to string) (string, string) {
	if from == "" {
		from = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}
	return from, to
}

// GetReportsSales returns aggregated sales for a date range.
func (s *DashboardService) GetReportsSales(storeID uuid.UUID, from, to string) (*ReportsSales, error) {
	ctx := context.Background()
	from, to = defaultDateRange(from, to)

	var r ReportsSales
	if err := s.db.QueryRow(ctx, `
		SELECT
		  COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0),
		  COUNT(*)
		FROM orders
		WHERE store_id = $1 AND created_at >= $2::date AND created_at < $3::date + INTERVAL '1 day'`,
		storeID, from, to,
	).Scan(&r.TotalRevenue, &r.TotalOrders); err != nil {
		return nil, fmt.Errorf("reports sales totals: %w", err)
	}
	if r.TotalOrders > 0 {
		r.AvgOrderValue = r.TotalRevenue / float64(r.TotalOrders)
	}

	rows, err := s.db.Query(ctx, `
		SELECT created_at::date::text AS day,
		       COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS revenue,
		       COUNT(*) AS orders
		FROM orders
		WHERE store_id = $1 AND created_at >= $2::date AND created_at < $3::date + INTERVAL '1 day'
		GROUP BY 1 ORDER BY 1 ASC`,
		storeID, from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("reports sales by day: %w", err)
	}
	defer rows.Close()
	r.ByDay = []ReportsSalesRow{}
	for rows.Next() {
		var row ReportsSalesRow
		if err := rows.Scan(&row.Date, &row.Revenue, &row.Orders); err != nil {
			return nil, fmt.Errorf("scan reports sales row: %w", err)
		}
		r.ByDay = append(r.ByDay, row)
	}
	return &r, rows.Err()
}

// GetReportsProducts returns top-selling products for a date range.
func (s *DashboardService) GetReportsProducts(storeID uuid.UUID, from, to string) (*ReportsProducts, error) {
	ctx := context.Background()
	from, to = defaultDateRange(from, to)

	rows, err := s.db.Query(ctx, `
		SELECT item->>'product_id' AS product_id,
		       item->>'product_name' AS product_name,
		       SUM((item->>'quantity')::int)     AS quantity_sold,
		       SUM((item->>'total')::numeric)    AS revenue
		FROM orders, jsonb_array_elements(items) AS item
		WHERE store_id = $1
		  AND status NOT IN ('cancelled')
		  AND items IS NOT NULL AND items != '[]'::jsonb
		  AND created_at >= $2::date AND created_at < $3::date + INTERVAL '1 day'
		GROUP BY 1, 2
		ORDER BY quantity_sold DESC
		LIMIT 20`,
		storeID, from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("reports top products: %w", err)
	}
	defer rows.Close()
	result := &ReportsProducts{TopProducts: []ReportsTopProduct{}}
	for rows.Next() {
		var p ReportsTopProduct
		if err := rows.Scan(&p.ProductID, &p.ProductName, &p.QuantitySold, &p.Revenue); err != nil {
			return nil, fmt.Errorf("scan top product: %w", err)
		}
		result.TopProducts = append(result.TopProducts, p)
	}
	return result, rows.Err()
}

// GetReportsCustomers returns top-spending customers for a date range.
func (s *DashboardService) GetReportsCustomers(storeID uuid.UUID, from, to string) (*ReportsCustomers, error) {
	ctx := context.Background()
	from, to = defaultDateRange(from, to)

	rows, err := s.db.Query(ctx, `
		SELECT o.customer_id::text,
		       COALESCE(c.name, 'Anónimo') AS customer_name,
		       COUNT(*)        AS orders_count,
		       SUM(o.total)    AS total_spent,
		       AVG(o.total)    AS avg_order_value
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id
		WHERE o.store_id = $1
		  AND o.status NOT IN ('cancelled')
		  AND o.customer_id IS NOT NULL
		  AND o.created_at >= $2::date AND o.created_at < $3::date + INTERVAL '1 day'
		GROUP BY 1, 2
		ORDER BY total_spent DESC
		LIMIT 20`,
		storeID, from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("reports top customers: %w", err)
	}
	defer rows.Close()
	result := &ReportsCustomers{TopCustomers: []ReportsTopCustomer{}}
	for rows.Next() {
		var c ReportsTopCustomer
		if err := rows.Scan(&c.CustomerID, &c.CustomerName, &c.OrdersCount, &c.TotalSpent, &c.AvgOrderValue); err != nil {
			return nil, fmt.Errorf("scan top customer: %w", err)
		}
		result.TopCustomers = append(result.TopCustomers, c)
	}
	return result, rows.Err()
}
