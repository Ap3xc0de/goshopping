package services

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"math"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

var ErrProductNotFound = errors.New("product not found")

// ProductService handles business logic for products.
type ProductService struct {
	db       *pgxpool.Pool
	cfg      *config.Config
	eventSvc *EventService
}

// NewProductService creates a new ProductService.
func NewProductService(db *pgxpool.Pool, cfg *config.Config, eventSvc *EventService) *ProductService {
	return &ProductService{db: db, cfg: cfg, eventSvc: eventSvc}
}

// ListProductsResult holds a paginated list of products.
type ListProductsResult struct {
	Products   []models.Product
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// ListProducts returns a paginated, filtered list of products for a store.
func (s *ProductService) ListProducts(storeID uuid.UUID, page, perPage int, category, status, search string) (*ListProductsResult, error) {
	ctx := context.Background()
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	conditions := []string{"store_id = $1", "status != 'deleted'"}
	args := []interface{}{storeID}
	idx := 2

	if category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", idx))
		args = append(args, category)
		idx++
	}
	if status != "" && status != "deleted" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		args = append(args, status)
		idx++
	}
	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR sku ILIKE $%d)", idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM products "+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count products: %w", err)
	}

	args = append(args, perPage, offset)
	query := fmt.Sprintf(`
		SELECT id, store_id, name, COALESCE(sku,'') as sku, COALESCE(description,'') as description,
		       price, COALESCE(cost,0) as cost, stock, min_stock, COALESCE(category,'') as category,
		       images, status, created_at, updated_at
		FROM products %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, idx, idx+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.StoreID, &p.Name, &p.SKU, &p.Description,
			&p.Price, &p.Cost, &p.Stock, &p.MinStock, &p.Category,
			&p.Images, &p.Status, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, p)
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}
	return &ListProductsResult{Products: products, Total: total, Page: page, PerPage: perPage, TotalPages: totalPages}, nil
}

// GetProduct returns a single product by ID, scoped to the store.
func (s *ProductService) GetProduct(storeID, productID uuid.UUID) (*models.Product, error) {
	ctx := context.Background()
	var p models.Product
	err := s.db.QueryRow(ctx, `
		SELECT id, store_id, name, COALESCE(sku,'') as sku, COALESCE(description,'') as description,
		       price, COALESCE(cost,0) as cost, stock, min_stock, COALESCE(category,'') as category,
		       images, status, created_at, updated_at
		FROM products
		WHERE id = $1 AND store_id = $2 AND status != 'deleted'`,
		productID, storeID,
	).Scan(&p.ID, &p.StoreID, &p.Name, &p.SKU, &p.Description,
		&p.Price, &p.Cost, &p.Stock, &p.MinStock, &p.Category,
		&p.Images, &p.Status, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductNotFound
		}
		return nil, fmt.Errorf("get product: %w", err)
	}
	return &p, nil
}

// CreateProduct creates a new product for the given store.
func (s *ProductService) CreateProduct(storeID uuid.UUID, req models.CreateProductRequest) (*models.Product, error) {
	ctx := context.Background()
	if req.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if req.Price.IsNegative() {
		return nil, fmt.Errorf("price must be non-negative")
	}
	if req.Stock < 0 {
		return nil, fmt.Errorf("stock must be non-negative")
	}

	status := "active"
	if req.Stock == 0 {
		status = "out_of_stock"
	}

	var p models.Product
	err := s.db.QueryRow(ctx, `
		INSERT INTO products (store_id, name, sku, description, price, cost, stock, min_stock, category, images, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]', $10)
		RETURNING id, store_id, name, COALESCE(sku,'') as sku, COALESCE(description,'') as description,
		          price, COALESCE(cost,0) as cost, stock, min_stock, COALESCE(category,'') as category,
		          images, status, created_at, updated_at`,
		storeID, req.Name, req.SKU, req.Description, req.Price, req.Cost,
		req.Stock, req.MinStock, req.Category, status,
	).Scan(&p.ID, &p.StoreID, &p.Name, &p.SKU, &p.Description,
		&p.Price, &p.Cost, &p.Stock, &p.MinStock, &p.Category,
		&p.Images, &p.Status, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create product: %w", err)
	}

	s.publishLowStockIfNeeded(&p)
	return &p, nil
}

// UpdateProduct applies a partial update to a product.
func (s *ProductService) UpdateProduct(storeID, productID uuid.UUID, req models.UpdateProductRequest) (*models.Product, error) {
	if req.Price != nil && req.Price.IsNegative() {
		return nil, fmt.Errorf("price must be non-negative")
	}
	if req.Stock != nil && *req.Stock < 0 {
		return nil, fmt.Errorf("stock must be non-negative")
	}

	cur, err := s.GetProduct(storeID, productID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		cur.Name = *req.Name
	}
	if req.SKU != nil {
		cur.SKU = *req.SKU
	}
	if req.Description != nil {
		cur.Description = *req.Description
	}
	if req.Price != nil {
		cur.Price = *req.Price
	}
	if req.Cost != nil {
		cur.Cost = *req.Cost
	}
	if req.Stock != nil {
		cur.Stock = *req.Stock
	}
	if req.MinStock != nil {
		cur.MinStock = *req.MinStock
	}
	if req.Category != nil {
		cur.Category = *req.Category
	}

	// Auto-adjust status based on stock changes (unless explicitly setting inactive/deleted)
	if req.Status != nil {
		cur.Status = *req.Status
	} else if cur.Status == "active" || cur.Status == "out_of_stock" {
		if cur.Stock == 0 {
			cur.Status = "out_of_stock"
		} else {
			cur.Status = "active"
		}
	}

	ctx := context.Background()
	var updated models.Product
	err = s.db.QueryRow(ctx, `
		UPDATE products
		SET name=$1, sku=$2, description=$3, price=$4, cost=$5,
		    stock=$6, min_stock=$7, category=$8, status=$9, updated_at=NOW()
		WHERE id=$10 AND store_id=$11
		RETURNING id, store_id, name, COALESCE(sku,'') as sku, COALESCE(description,'') as description,
		          price, COALESCE(cost,0) as cost, stock, min_stock, COALESCE(category,'') as category,
		          images, status, created_at, updated_at`,
		cur.Name, cur.SKU, cur.Description, cur.Price, cur.Cost,
		cur.Stock, cur.MinStock, cur.Category, cur.Status,
		productID, storeID,
	).Scan(&updated.ID, &updated.StoreID, &updated.Name, &updated.SKU, &updated.Description,
		&updated.Price, &updated.Cost, &updated.Stock, &updated.MinStock, &updated.Category,
		&updated.Images, &updated.Status, &updated.CreatedAt, &updated.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update product: %w", err)
	}

	s.publishLowStockIfNeeded(&updated)
	return &updated, nil
}

// DeleteProduct soft-deletes a product (status = 'deleted').
func (s *ProductService) DeleteProduct(storeID, productID uuid.UUID) error {
	ctx := context.Background()
	tag, err := s.db.Exec(ctx, `
		UPDATE products SET status='deleted', updated_at=NOW()
		WHERE id=$1 AND store_id=$2 AND status != 'deleted'`,
		productID, storeID,
	)
	if err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrProductNotFound
	}
	return nil
}

// BulkImportResult contains the result of a CSV bulk import.
type BulkImportResult struct {
	Imported int      `json:"imported"`
	Errors   int      `json:"errors"`
	Details  []string `json:"details,omitempty"`
}

// BulkImportProducts imports products from a CSV reader.
// Required CSV columns: name, price. Optional: sku, description, stock, min_stock, category, cost.
func (s *ProductService) BulkImportProducts(storeID uuid.UUID, r io.Reader) (*BulkImportResult, error) {
	cr := csv.NewReader(r)
	cr.TrimLeadingSpace = true
	headers, err := cr.Read()
	if err != nil {
		return nil, fmt.Errorf("read CSV headers: %w", err)
	}

	idx := map[string]int{}
	for i, h := range headers {
		idx[strings.ToLower(strings.TrimSpace(h))] = i
	}

	get := func(record []string, col string) string {
		if i, ok := idx[col]; ok && i < len(record) {
			return strings.TrimSpace(record[i])
		}
		return ""
	}

	result := &BulkImportResult{Details: []string{}}
	rowNum := 1
	for {
		record, err := cr.Read()
		if err == io.EOF {
			break
		}
		rowNum++
		if err != nil {
			result.Errors++
			result.Details = append(result.Details, fmt.Sprintf("row %d: read error: %v", rowNum, err))
			continue
		}

		name := get(record, "name")
		if name == "" {
			result.Errors++
			result.Details = append(result.Details, fmt.Sprintf("row %d: missing name", rowNum))
			continue
		}

		priceDecimal, _ := decimal.NewFromString(get(record, "price"))
		costDecimal, _ := decimal.NewFromString(get(record, "cost"))
		var stock int
		fmt.Sscanf(get(record, "stock"), "%d", &stock)
		var minStock int
		fmt.Sscanf(get(record, "min_stock"), "%d", &minStock)

		req := models.CreateProductRequest{
			Name:        name,
			SKU:         get(record, "sku"),
			Description: get(record, "description"),
			Price:       models.Money{Decimal: priceDecimal},
			Cost:        models.Money{Decimal: costDecimal},
			Stock:       stock,
			MinStock:    minStock,
			Category:    get(record, "category"),
		}

		if _, err := s.CreateProduct(storeID, req); err != nil {
			result.Errors++
			result.Details = append(result.Details, fmt.Sprintf("row %d (%q): %v", rowNum, name, err))
		} else {
			result.Imported++
		}
	}
	return result, nil
}

// ImageUploadResult holds the pre-signed upload URL and the final image URL.
type ImageUploadResult struct {
	UploadURL string `json:"upload_url"`
	ImageURL  string `json:"image_url"`
}

// GetProductImageUploadURL generates a pre-signed S3 PUT URL for a product image
// and persists the image URL in the product's images array.
func (s *ProductService) GetProductImageUploadURL(storeID, productID uuid.UUID, filename, contentType string) (*ImageUploadResult, error) {
	if _, err := s.GetProduct(storeID, productID); err != nil {
		return nil, err
	}

	key := fmt.Sprintf("products/%s/%s/%s", storeID.String(), productID.String(), filename)
	ctx := context.Background()

	var result *ImageUploadResult

	if s.cfg.S3BucketAssets == "" {
		// Development: return mock LocalStack URL
		mockURL := fmt.Sprintf("http://localhost:4566/goshopping-assets/%s", key)
		result = &ImageUploadResult{UploadURL: mockURL, ImageURL: mockURL}
	} else {
		awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(s.cfg.AWSRegion))
		if err != nil {
			return nil, fmt.Errorf("load AWS config: %w", err)
		}

		s3Client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
			if s.cfg.S3Endpoint != "" {
				o.BaseEndpoint = aws.String(s.cfg.S3Endpoint)
				o.UsePathStyle = true
			}
		})

		presignClient := s3.NewPresignClient(s3Client)
		presigned, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(s.cfg.S3BucketAssets),
			Key:         aws.String(key),
			ContentType: aws.String(contentType),
		}, s3.WithPresignExpires(15*time.Minute))
		if err != nil {
			return nil, fmt.Errorf("presign S3 URL: %w", err)
		}

		// When a custom endpoint is configured (LocalStack), use path-style URL
		// so the image is accessible from the browser at the same host.
		var imageURL string
		if s.cfg.S3Endpoint != "" {
			imageURL = fmt.Sprintf("%s/%s/%s", s.cfg.S3Endpoint, s.cfg.S3BucketAssets, key)
		} else {
			imageURL = fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.cfg.S3BucketAssets, s.cfg.AWSRegion, key)
		}
		result = &ImageUploadResult{UploadURL: presigned.URL, ImageURL: imageURL}
	}

	// Persist the image URL in the product's images array.
	_, err := s.db.Exec(ctx, `
		UPDATE products
		SET images = images || jsonb_build_array($1::text), updated_at = NOW()
		WHERE id = $2 AND store_id = $3`,
		result.ImageURL, productID, storeID)
	if err != nil {
		return nil, fmt.Errorf("append product image: %w", err)
	}

	return result, nil
}

func (s *ProductService) publishLowStockIfNeeded(p *models.Product) {
	if p.MinStock > 0 && p.Stock <= p.MinStock && s.cfg.SQSNotificationEventsURL != "" {
		_ = s.eventSvc.Publish(s.cfg.SQSNotificationEventsURL, "stock.low", p.StoreID.String(), map[string]interface{}{
			"product_id": p.ID.String(),
			"name":       p.Name,
			"stock":      p.Stock,
			"min_stock":  p.MinStock,
		})
	}
}
