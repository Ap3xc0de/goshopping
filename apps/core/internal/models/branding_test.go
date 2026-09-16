package models_test

import (
	"strings"
	"testing"

	"github.com/goshopping/core/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testAssetPrefix = "https://goshopping-assets.s3.us-east-1.amazonaws.com/branding/11111111-1111-1111-1111-111111111111/"

func TestStoreBranding_Validate(t *testing.T) {
	t.Run("zero-value branding is valid", func(t *testing.T) {
		b := &models.StoreBranding{}
		assert.NoError(t, b.Validate(testAssetPrefix))
	})

	t.Run("valid full branding passes", func(t *testing.T) {
		b := &models.StoreBranding{
			BrandName: "Acme",
			Colors: models.BrandColors{
				Primary:    "142 71% 45%",
				Background: "0 0% 100%",
			},
			Fonts:   models.BrandFonts{Heading: "Poppins", Body: "Inter"},
			LogoURL: testAssetPrefix + "logo.png",
		}
		assert.NoError(t, b.Validate(testAssetPrefix))
	})

	t.Run("hue out of range is rejected", func(t *testing.T) {
		b := &models.StoreBranding{Colors: models.BrandColors{Primary: "400 71% 45%"}}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "colors.primary")
	})

	t.Run("saturation out of range is rejected", func(t *testing.T) {
		b := &models.StoreBranding{Colors: models.BrandColors{Primary: "200 150% 45%"}}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "colors.primary")
	})

	t.Run("malformed HSL string is rejected", func(t *testing.T) {
		b := &models.StoreBranding{Colors: models.BrandColors{Primary: "blue"}}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
	})

	t.Run("font outside whitelist is rejected", func(t *testing.T) {
		b := &models.StoreBranding{Fonts: models.BrandFonts{Heading: "Comic Sans MS"}}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "fonts.heading")
	})

	t.Run("logo_url from external domain is rejected", func(t *testing.T) {
		b := &models.StoreBranding{LogoURL: "https://evil.com/logo.png"}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "logo_url")
	})

	t.Run("logo_url bypass via query string host lookalike is rejected", func(t *testing.T) {
		b := &models.StoreBranding{
			LogoURL: "https://evil.com/?x=goshopping-assets.s3.us-east-1.amazonaws.com/branding/11111111-1111-1111-1111-111111111111/",
		}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
	})

	t.Run("logo_url pointing at another store's prefix on the same bucket is rejected", func(t *testing.T) {
		b := &models.StoreBranding{
			LogoURL: "https://goshopping-assets.s3.us-east-1.amazonaws.com/branding/22222222-2222-2222-2222-222222222222/logo.png",
		}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "logo_url")
	})

	t.Run("favicon_url outside prefix is rejected", func(t *testing.T) {
		b := &models.StoreBranding{FaviconURL: "https://evil.com/favicon.ico"}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "favicon_url")
	})

	t.Run("multiple invalid fields are all reported together", func(t *testing.T) {
		b := &models.StoreBranding{
			Colors: models.BrandColors{Primary: "400 71% 45%"},
			Fonts:  models.BrandFonts{Heading: "Comic Sans MS"},
		}
		err := b.Validate(testAssetPrefix)
		require.Error(t, err)
		msg := err.Error()
		assert.True(t, strings.Contains(msg, "colors.primary"), "expected colors.primary in %q", msg)
		assert.True(t, strings.Contains(msg, "fonts.heading"), "expected fonts.heading in %q", msg)
	})
}
