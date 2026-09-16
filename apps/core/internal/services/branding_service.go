package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrStoreNotFound indicates a branding write targeted a store row that
// does not exist (only reachable via the superadmin StoreContext bypass).
var ErrStoreNotFound = errors.New("store not found")

// BrandingService handles store branding persistence and logo/favicon uploads.
type BrandingService struct {
	db  *pgxpool.Pool
	cfg *config.Config
}

// NewBrandingService creates a new BrandingService.
func NewBrandingService(db *pgxpool.Pool, cfg *config.Config) *BrandingService {
	return &BrandingService{db: db, cfg: cfg}
}

// GetBranding returns the store's branding, or a zero-value default if none
// has been set yet. Per REQ-BRANDING-01 this endpoint never surfaces a
// not-found error: an unknown store id also yields the zero-value default.
func (s *BrandingService) GetBranding(ctx context.Context, storeID uuid.UUID) (*models.StoreBranding, error) {
	var raw []byte
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(config->'branding', '{}'::jsonb) FROM stores WHERE id = $1`,
		storeID,
	).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return &models.StoreBranding{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query branding: %w", err)
	}

	var branding models.StoreBranding
	if err := json.Unmarshal(raw, &branding); err != nil {
		return nil, fmt.Errorf("decode branding: %w", err)
	}
	return &branding, nil
}

// UpdateBranding validates the branding, then atomically merges it into
// stores.config under the "branding" key, leaving sibling config keys
// (currency, locale, etc.) untouched. Validation runs before any write, so
// an invalid payload never persists partially.
func (s *BrandingService) UpdateBranding(ctx context.Context, storeID uuid.UUID, branding models.StoreBranding) (*models.StoreBranding, error) {
	if err := branding.Validate(s.allowedAssetPrefix(storeID)); err != nil {
		return nil, err
	}

	payload, err := json.Marshal(branding)
	if err != nil {
		return nil, fmt.Errorf("encode branding: %w", err)
	}

	tag, err := s.db.Exec(ctx, `
		UPDATE stores
		SET config = config || jsonb_build_object('branding', $1::jsonb), updated_at = NOW()
		WHERE id = $2`,
		string(payload), storeID)
	if err != nil {
		return nil, fmt.Errorf("update branding: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrStoreNotFound
	}

	return &branding, nil
}

// PresignLogoUpload generates a pre-signed S3 PUT URL scoped to this store's
// own branding prefix, mirroring ProductService.GetProductImageUploadURL.
func (s *BrandingService) PresignLogoUpload(ctx context.Context, storeID uuid.UUID, filename, contentType string) (*ImageUploadResult, error) {
	key := fmt.Sprintf("branding/%s/%s", storeID.String(), filename)

	if s.cfg.S3BucketAssets == "" {
		// Development: return mock LocalStack URL.
		mockURL := fmt.Sprintf("http://localhost:4566/goshopping-assets/%s", key)
		return &ImageUploadResult{UploadURL: mockURL, ImageURL: mockURL}, nil
	}

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

	var imageURL string
	if s.cfg.S3Endpoint != "" {
		imageURL = fmt.Sprintf("%s/%s/%s", s.cfg.S3Endpoint, s.cfg.S3BucketAssets, key)
	} else {
		imageURL = fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.cfg.S3BucketAssets, s.cfg.AWSRegion, key)
	}
	return &ImageUploadResult{UploadURL: presigned.URL, ImageURL: imageURL}, nil
}

// allowedAssetPrefix returns the exact scheme+host+path prefix that this
// store's logo/favicon URLs must fall under. It mirrors the URL shapes
// produced by PresignLogoUpload so a presigned upload's resulting ImageURL
// always validates for the same store.
func (s *BrandingService) allowedAssetPrefix(storeID uuid.UUID) string {
	prefix := fmt.Sprintf("branding/%s/", storeID.String())

	if s.cfg.S3BucketAssets == "" {
		return fmt.Sprintf("http://localhost:4566/goshopping-assets/%s", prefix)
	}
	if s.cfg.S3Endpoint != "" {
		return fmt.Sprintf("%s/%s/%s", s.cfg.S3Endpoint, s.cfg.S3BucketAssets, prefix)
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.cfg.S3BucketAssets, s.cfg.AWSRegion, prefix)
}
