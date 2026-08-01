package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
	"github.com/xuri/excelize/v2"
)

// IVARate is the Colombian VAT rate (19%).
var IVARate = decimal.NewFromFloat(0.19)

var (
	ErrOrderNotFound           = errors.New("order not found")
	ErrInvalidStatusTransition = errors.New("invalid status transition")
	ErrInsufficientStock       = errors.New("insufficient stock")
)

var orderTransitions = map[string][]string{
	"pending":   {"paid", "cancelled"},
	"paid":      {"preparing", "cancelled"},
	"preparing": {"shipped", "cancelled"},
	"shipped":   {"delivered", "cancelled"},
	"delivered": {},
	"cancelled": {},
}

// OrderDetail is an Order with its timeline included.
type OrderDetail struct {
	models.Order
	Timeline []models.OrderTimeline `json:"timeline"`
}

// OrderService handles business logic for orders.
type OrderService struct {
	db        *pgxpool.Pool
	cfg       *config.Config
	eventSvc  *EventService
	outboxSvc *OutboxService
	custSvc   *CustomerService
	prodSvc   *ProductService
}

// NewOrderService creates a new OrderService.
func NewOrderService(db *pgxpool.Pool, cfg *config.Config, eventSvc *EventService, outboxSvc *OutboxService, custSvc *CustomerService, prodSvc *ProductService) *OrderService {
	return &OrderService{db: db, cfg: cfg, eventSvc: eventSvc, outboxSvc: outboxSvc, custSvc: custSvc, prodSvc: prodSvc}
}

// ListOrdersResult holds paginated orders.
type ListOrdersResult struct {
	Orders     []models.Order
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// ListOrders returns filtered, paginated orders for a store.
func (s *OrderService) ListOrders(storeID uuid.UUID, page, perPage int, status, from, to, customerID string) (*ListOrdersResult, error) {
	ctx := context.Background()
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	conditions := []string{"o.store_id = $1"}
	args := []interface{}{storeID}
	idx := 2

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("o.status = $%d", idx))
		args = append(args, status)
		idx++
	}
	if from != "" {
		conditions = append(conditions, fmt.Sprintf("o.created_at >= $%d::timestamptz", idx))
		args = append(args, from)
		idx++
	}
	if to != "" {
		conditions = append(conditions, fmt.Sprintf("o.created_at <= $%d::timestamptz", idx))
		args = append(args, to)
		idx++
	}
	if customerID != "" {
		conditions = append(conditions, fmt.Sprintf("o.customer_id = $%d", idx))
		args = append(args, customerID)
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM orders o "+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count orders: %w", err)
	}

	args = append(args, perPage, offset)
	query := fmt.Sprintf(`
		SELECT o.id, o.store_id, o.customer_id, o.status, o.items, o.subtotal, o.tax, o.total,
		       COALESCE(o.payment_method,'') AS payment_method,
		       COALESCE(o.payment_ref,'')    AS payment_ref,
		       COALESCE(o.shipping_tracking,'') AS shipping_tracking,
		       COALESCE(o.notes,'') AS notes, o.created_at, o.updated_at,
		       UPPER(SUBSTRING(o.id::text, 1, 8))    AS order_number,
		       COALESCE(c.name,'')                   AS customer_name,
		       COALESCE(c.email,'')                  AS customer_email,
		       COALESCE(c.phone,'')                  AS customer_phone,
		       COALESCE(c.address,'')          AS customer_address
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id AND c.store_id = o.store_id
		%s
		ORDER BY o.created_at DESC
		LIMIT $%d OFFSET $%d`, where, idx, idx+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query orders: %w", err)
	}
	defer rows.Close()

	orders := []models.Order{}
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.StoreID, &o.CustomerID, &o.Status, &o.Items,
			&o.Subtotal, &o.Tax, &o.Total, &o.PaymentMethod, &o.PaymentRef,
			&o.ShippingTracking, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
			&o.OrderNumber, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone, &o.CustomerAddress); err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		orders = append(orders, o)
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}
	return &ListOrdersResult{Orders: orders, Total: total, Page: page, PerPage: perPage, TotalPages: totalPages}, nil
}

// GetOrder returns a single order with its timeline.
func (s *OrderService) GetOrder(storeID, orderID uuid.UUID) (*OrderDetail, error) {
	ctx := context.Background()
	var o models.Order
	err := s.db.QueryRow(ctx, `
		SELECT o.id, o.store_id, o.customer_id, o.status, o.items, o.subtotal, o.tax, o.total,
		       COALESCE(o.payment_method,'')     AS payment_method,
		       COALESCE(o.payment_ref,'')        AS payment_ref,
		       COALESCE(o.shipping_tracking,'')  AS shipping_tracking,
		       COALESCE(o.notes,'')              AS notes, o.created_at, o.updated_at,
		       UPPER(SUBSTRING(o.id::text, 1, 8)) AS order_number,
		       COALESCE(c.name,'')               AS customer_name,
		       COALESCE(c.email,'')              AS customer_email,
		       COALESCE(c.phone,'')              AS customer_phone,
		       COALESCE(c.address,'')      AS customer_address
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id AND c.store_id = o.store_id
		WHERE o.id = $1 AND o.store_id = $2`,
		orderID, storeID,
	).Scan(&o.ID, &o.StoreID, &o.CustomerID, &o.Status, &o.Items,
		&o.Subtotal, &o.Tax, &o.Total, &o.PaymentMethod, &o.PaymentRef,
		&o.ShippingTracking, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
		&o.OrderNumber, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone, &o.CustomerAddress)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("get order: %w", err)
	}

	tl, err := s.getTimeline(ctx, orderID)
	if err != nil {
		return nil, err
	}
	return &OrderDetail{Order: o, Timeline: tl}, nil
}

// GetOrderByIDOnly retrieves an order without store scoping (for public access token validation).
func (s *OrderService) GetOrderByIDOnly(orderID uuid.UUID) (*OrderDetail, error) {
	ctx := context.Background()
	var o models.Order
	err := s.db.QueryRow(ctx, `
		SELECT o.id, o.store_id, o.customer_id, o.status, o.items, o.subtotal, o.tax, o.total,
		       COALESCE(o.payment_method,'')    AS payment_method,
		       COALESCE(o.payment_ref,'')       AS payment_ref,
		       COALESCE(o.shipping_tracking,'') AS shipping_tracking,
		       COALESCE(o.notes,'')             AS notes, o.created_at, o.updated_at,
		       UPPER(SUBSTRING(o.id::text, 1, 8)) AS order_number,
		       COALESCE(c.name,'')              AS customer_name,
		       COALESCE(c.email,'')             AS customer_email,
		       COALESCE(c.phone,'')             AS customer_phone,
		       COALESCE(c.address,'')     AS customer_address
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id AND c.store_id = o.store_id
		WHERE o.id = $1`, orderID,
	).Scan(&o.ID, &o.StoreID, &o.CustomerID, &o.Status, &o.Items,
		&o.Subtotal, &o.Tax, &o.Total, &o.PaymentMethod, &o.PaymentRef,
		&o.ShippingTracking, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
		&o.OrderNumber, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone, &o.CustomerAddress)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("get order: %w", err)
	}
	tl, err := s.getTimeline(ctx, orderID)
	if err != nil {
		return nil, err
	}
	return &OrderDetail{Order: o, Timeline: tl}, nil
}

func (s *OrderService) getTimeline(ctx context.Context, orderID uuid.UUID) ([]models.OrderTimeline, error) {
	rows, err := s.db.Query(ctx, `
		SELECT ot.id, ot.order_id, ot.status, ot.changed_by,
		       COALESCE(ot.notes,'') AS notes, ot.created_at,
		       COALESCE(a.name, a.email, 'Sistema') AS changed_by_name
		FROM order_timeline ot
		LEFT JOIN accounts a ON ot.changed_by = a.id
		WHERE ot.order_id = $1 ORDER BY ot.created_at ASC`, orderID)
	if err != nil {
		return nil, fmt.Errorf("query timeline: %w", err)
	}
	defer rows.Close()

	tl := []models.OrderTimeline{}
	for rows.Next() {
		var t models.OrderTimeline
		if err := rows.Scan(&t.ID, &t.OrderID, &t.Status, &t.ChangedBy, &t.Notes, &t.CreatedAt, &t.ChangedByName); err != nil {
			return nil, fmt.Errorf("scan timeline: %w", err)
		}
		tl = append(tl, t)
	}
	return tl, rows.Err()
}

// CreateOrder creates a new pending order.
func (s *OrderService) CreateOrder(storeID uuid.UUID, req models.CreateOrderInput, changedBy *uuid.UUID) (*OrderDetail, error) {
	ctx := context.Background()
	if len(req.Items) == 0 {
		return nil, fmt.Errorf("at least one item is required")
	}

	var resolved []models.OrderItem
	subtotal := models.MoneyZero()
	for _, inp := range req.Items {
		if inp.Quantity <= 0 {
			return nil, fmt.Errorf("quantity must be > 0")
		}
		pid, err := uuid.Parse(inp.ProductID)
		if err != nil {
			return nil, fmt.Errorf("invalid product_id %q", inp.ProductID)
		}
		p, err := s.prodSvc.GetProduct(storeID, pid)
		if err != nil {
			return nil, fmt.Errorf("product %s: %w", inp.ProductID, err)
		}
		lineTotal := p.Price.MulInt(inp.Quantity)
		subtotal = subtotal.Add(lineTotal)
		resolved = append(resolved, models.OrderItem{
			ProductID: p.ID.String(),
			Name:      p.Name,
			Quantity:  inp.Quantity,
			Price:     p.Price,
			Total:     lineTotal,
		})
	}

	tax := subtotal.Mul(IVARate).Round2()
	total := subtotal.Add(tax)

	// Resolve customer
	var customerID *uuid.UUID
	if req.CustomerID != nil && *req.CustomerID != "" {
		cid, err := uuid.Parse(*req.CustomerID)
		if err != nil {
			return nil, fmt.Errorf("invalid customer_id")
		}
		if _, err = s.custSvc.GetCustomer(storeID, cid); err != nil {
			return nil, fmt.Errorf("customer: %w", err)
		}
		customerID = &cid
	} else if req.CustomerName != "" {
		cust, err := s.custSvc.CreateOrUpsertCustomer(storeID, models.CreateCustomerRequest{
			Name:  req.CustomerName,
			Email: req.CustomerEmail,
			Phone: req.CustomerPhone,
		})
		if err != nil {
			return nil, fmt.Errorf("create customer: %w", err)
		}
		customerID = &cust.ID
	}

	itemsJSON, err := json.Marshal(resolved)
	if err != nil {
		return nil, fmt.Errorf("marshal items: %w", err)
	}

	var orderID uuid.UUID
	if err = s.db.QueryRow(ctx, `
		INSERT INTO orders (store_id, customer_id, status, items, subtotal, tax, total, payment_method, notes)
		VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8)
		RETURNING id`,
		storeID, customerID, itemsJSON, subtotal, tax, total,
		req.PaymentMethod, req.Notes,
	).Scan(&orderID); err != nil {
		return nil, fmt.Errorf("insert order: %w", err)
	}

	if _, err = s.db.Exec(ctx, `
		INSERT INTO order_timeline (order_id, status, changed_by, notes)
		VALUES ($1, 'pending', $2, 'Pedido creado')`, orderID, changedBy); err != nil {
		return nil, fmt.Errorf("insert timeline: %w", err)
	}

	if err := s.eventSvc.Publish(s.cfg.SQSOrderEventsURL, "order.created", storeID.String(), map[string]interface{}{
		"order_id": orderID.String(),
		"total":    total.InexactFloat64(),
	}); err != nil {
		log.Printf("order.created publish failed: %v", err)
	}

	return s.GetOrder(storeID, orderID)
}

// ChangeOrderStatus transitions an order to a new valid status.
func (s *OrderService) ChangeOrderStatus(storeID, orderID uuid.UUID, req models.UpdateOrderStatusInput, changedBy *uuid.UUID) (*OrderDetail, error) {
	ctx := context.Background()

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var curStatus string
	var itemsJSON []byte
	if err = tx.QueryRow(ctx, `
		SELECT status, items FROM orders WHERE id = $1 AND store_id = $2 FOR UPDATE`,
		orderID, storeID,
	).Scan(&curStatus, &itemsJSON); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("lock order: %w", err)
	}

	if !isValidOrderTransition(curStatus, req.Status) {
		return nil, fmt.Errorf("%w: %s → %s", ErrInvalidStatusTransition, curStatus, req.Status)
	}

	var items []models.OrderItem
	if err = json.Unmarshal(itemsJSON, &items); err != nil {
		return nil, fmt.Errorf("parse items: %w", err)
	}

	if req.Status == "paid" {
		for _, item := range items {
			tag, err := tx.Exec(ctx, `
				UPDATE products
				SET stock = stock - $1,
				    status = CASE WHEN (stock - $1) <= 0 THEN 'out_of_stock' ELSE 'active' END,
				    updated_at = NOW()
				WHERE id = $2 AND store_id = $3 AND stock >= $1`,
				item.Quantity, item.ProductID, storeID)
			if err != nil {
				return nil, fmt.Errorf("deduct stock for %s: %w", item.ProductID, err)
			}
			if tag.RowsAffected() == 0 {
				var avail int
				tx.QueryRow(ctx, "SELECT stock FROM products WHERE id = $1 AND store_id = $2", item.ProductID, storeID).Scan(&avail) //nolint:errcheck
				return nil, fmt.Errorf("%w: product %s needs %d but has %d",
					ErrInsufficientStock, item.ProductID, item.Quantity, avail)
			}
		}
	}

	// ponytail: cancel from shipped allowed without stock restore — needs explicit return flow later
	if req.Status == "cancelled" && (curStatus == "paid" || curStatus == "preparing") {
		for _, item := range items {
			if _, err = tx.Exec(ctx, `
				UPDATE products
				SET stock = stock + $1,
				    status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END,
				    updated_at = NOW()
				WHERE id = $2 AND store_id = $3`,
				item.Quantity, item.ProductID, storeID); err != nil {
				return nil, fmt.Errorf("restore stock for %s: %w", item.ProductID, err)
			}
		}
	}

	if _, err = tx.Exec(ctx, `
		UPDATE orders
		SET status=$1,
		    payment_ref     = COALESCE(NULLIF($2,''), payment_ref),
		    shipping_tracking = COALESCE(NULLIF($3,''), shipping_tracking),
		    updated_at = NOW()
		WHERE id=$4 AND store_id=$5`,
		req.Status, req.PaymentRef, req.ShippingTracking, orderID, storeID); err != nil {
		return nil, fmt.Errorf("update order: %w", err)
	}

	note := req.Note
	if note == "" {
		note = fmt.Sprintf("Estado cambiado de %s a %s", curStatus, req.Status)
	}
	if _, err = tx.Exec(ctx, `
		INSERT INTO order_timeline (order_id, status, changed_by, notes)
		VALUES ($1, $2, $3, $4)`, orderID, req.Status, changedBy, note); err != nil {
		return nil, fmt.Errorf("insert timeline: %w", err)
	}

	payload := map[string]interface{}{
		"order_id":   orderID.String(),
		"old_status": curStatus,
		"new_status": req.Status,
	}
	outboxID, err := s.outboxSvc.InsertTx(ctx, tx, storeID, "order.status_changed", payload)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	if err := s.outboxSvc.PublishOne(ctx, outboxID, storeID, "order.status_changed", payload); err != nil {
		log.Printf("order.status_changed publish failed (outbox %s will retry): %v", outboxID, err)
	}
	if _, err := s.outboxSvc.PublishPending(ctx); err != nil {
		log.Printf("outbox PublishPending: %v", err)
	}

	return s.GetOrder(storeID, orderID)
}

// CancelOrder is a convenience wrapper around ChangeOrderStatus.
func (s *OrderService) CancelOrder(storeID, orderID uuid.UUID, req models.CancelOrderInput, changedBy *uuid.UUID) (*OrderDetail, error) {
	return s.ChangeOrderStatus(storeID, orderID, models.UpdateOrderStatusInput{
		Status: "cancelled",
		Note:   req.Reason,
	}, changedBy)
}

// ExportOrders produces an XLSX file of orders for the given store and date range.
func (s *OrderService) ExportOrders(storeID uuid.UUID, from, to string) ([]byte, string, error) {
	result, err := s.ListOrders(storeID, 1, 1000, "", from, to, "")
	if err != nil {
		return nil, "", fmt.Errorf("list orders: %w", err)
	}

	f := excelize.NewFile()
	defer f.Close()
	sheet := "Pedidos"
	f.SetSheetName("Sheet1", sheet)

	headers := []interface{}{"ID Pedido", "Estado", "Subtotal", "IVA", "Total", "Método de pago", "Ref. pago", "Seguimiento", "Fecha"}
	for col, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	for row, o := range result.Orders {
		r := row + 2
		vals := []interface{}{
			o.ID.String(), o.Status,
			o.Subtotal, o.Tax, o.Total,
			o.PaymentMethod, o.PaymentRef, o.ShippingTracking,
			o.CreatedAt.Format(time.RFC3339),
		}
		for col, v := range vals {
			cell, _ := excelize.CoordinatesToCellName(col+1, r)
			f.SetCellValue(sheet, cell, v)
		}
	}

	var buf bytes.Buffer
	if err = f.Write(&buf); err != nil {
		return nil, "", fmt.Errorf("write xlsx: %w", err)
	}

	filename := fmt.Sprintf("pedidos-%s.xlsx", time.Now().Format("20060102-150405"))
	return buf.Bytes(), filename, nil
}

func isValidOrderTransition(from, to string) bool {
	nexts := orderTransitions[from]
	for _, n := range nexts {
		if n == to {
			return true
		}
	}
	return false
}
