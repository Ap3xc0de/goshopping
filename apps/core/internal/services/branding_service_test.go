package services_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBrandingService_GetBranding(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewBrandingService(app.DB, app.Config)

	t.Run("returns zero-value branding for a store without one", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		branding, err := svc.GetBranding(context.Background(), uuid.MustParse(storeID))
		require.NoError(t, err)
		assert.Equal(t, "", branding.BrandName)
		assert.Equal(t, "", branding.Colors.Primary)
	})

	t.Run("never errors for an unknown store id", func(t *testing.T) {
		branding, err := svc.GetBranding(context.Background(), uuid.New())
		require.NoError(t, err)
		assert.NotNil(t, branding)
	})
}

func TestBrandingService_UpdateBranding(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewBrandingService(app.DB, app.Config)

	t.Run("round-trips a valid branding document", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		storeIDParsed := uuid.MustParse(storeID)

		in := models.StoreBranding{
			BrandName: "Acme",
			Colors:    models.BrandColors{Primary: "142 71% 45%"},
			Fonts:     models.BrandFonts{Heading: "Poppins", Body: "Inter"},
		}
		saved, err := svc.UpdateBranding(context.Background(), storeIDParsed, in)
		require.NoError(t, err)
		assert.Equal(t, "Acme", saved.BrandName)

		got, err := svc.GetBranding(context.Background(), storeIDParsed)
		require.NoError(t, err)
		assert.Equal(t, in.BrandName, got.BrandName)
		assert.Equal(t, in.Colors.Primary, got.Colors.Primary)
		assert.Equal(t, in.Fonts.Heading, got.Fonts.Heading)
	})

	t.Run("rejects invalid HSL without persisting", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		storeIDParsed := uuid.MustParse(storeID)

		_, err := svc.UpdateBranding(context.Background(), storeIDParsed,
			models.StoreBranding{Colors: models.BrandColors{Primary: "400 71% 45%"}})
		require.Error(t, err)
		var verr models.ValidationErrors
		require.ErrorAs(t, err, &verr)

		got, err := svc.GetBranding(context.Background(), storeIDParsed)
		require.NoError(t, err)
		assert.Empty(t, got.Colors.Primary)
	})

	t.Run("merges branding without destroying sibling config keys", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		storeIDParsed := uuid.MustParse(storeID)

		_, err := app.DB.Exec(context.Background(),
			`UPDATE stores SET config = '{"currency":"USD","locale":"es-CL"}' WHERE id = $1`, storeIDParsed)
		require.NoError(t, err)

		_, err = svc.UpdateBranding(context.Background(), storeIDParsed,
			models.StoreBranding{BrandName: "Merged"})
		require.NoError(t, err)

		var raw []byte
		require.NoError(t, app.DB.QueryRow(context.Background(),
			"SELECT config FROM stores WHERE id = $1", storeIDParsed).Scan(&raw))
		var cfg map[string]interface{}
		require.NoError(t, json.Unmarshal(raw, &cfg))
		assert.Equal(t, "USD", cfg["currency"])
		assert.Equal(t, "es-CL", cfg["locale"])
		branding, _ := cfg["branding"].(map[string]interface{})
		assert.Equal(t, "Merged", branding["brand_name"])
	})

	t.Run("accepts a logo_url produced by PresignLogoUpload for the same store", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		storeIDParsed := uuid.MustParse(storeID)

		presigned, err := svc.PresignLogoUpload(context.Background(), storeIDParsed, "logo.png", "image/png")
		require.NoError(t, err)

		saved, err := svc.UpdateBranding(context.Background(), storeIDParsed,
			models.StoreBranding{LogoURL: presigned.ImageURL})
		require.NoError(t, err)
		assert.Equal(t, presigned.ImageURL, saved.LogoURL)
	})

	t.Run("rejects a logo_url from another store's own prefix", func(t *testing.T) {
		_, _, storeID := app.OwnerAuthHeader(t)
		storeIDParsed := uuid.MustParse(storeID)

		_, _, otherStoreID := app.OwnerAuthHeader(t)
		otherPresigned, err := svc.PresignLogoUpload(context.Background(), uuid.MustParse(otherStoreID), "logo.png", "image/png")
		require.NoError(t, err)

		_, err = svc.UpdateBranding(context.Background(), storeIDParsed,
			models.StoreBranding{LogoURL: otherPresigned.ImageURL})
		require.Error(t, err)
	})
}

func TestBrandingService_PresignLogoUpload(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	svc := services.NewBrandingService(app.DB, app.Config)
	_, _, storeID := app.OwnerAuthHeader(t)

	result, err := svc.PresignLogoUpload(context.Background(), uuid.MustParse(storeID), "logo.png", "image/png")
	require.NoError(t, err)
	assert.NotEmpty(t, result.UploadURL)
	assert.Contains(t, result.ImageURL, "branding/"+storeID+"/logo.png")
}
