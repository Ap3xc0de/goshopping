package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
)

// GetBranding handles GET /stores/:storeId/branding
func GetBranding(svc *services.BrandingService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		branding, err := svc.GetBranding(c.Context(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(branding)
	}
}

// UpdateBranding handles PUT /stores/:storeId/branding
func UpdateBranding(svc *services.BrandingService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		var req models.StoreBranding
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		branding, err := svc.UpdateBranding(c.Context(), storeID, req)
		if err != nil {
			if errors.Is(err, services.ErrStoreNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "store not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.JSON(branding)
	}
}

// BrandingLogoUpload handles POST /stores/:storeId/branding/logo
func BrandingLogoUpload(svc *services.BrandingService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		var body struct {
			Filename    string `json:"filename"`
			ContentType string `json:"content_type"`
		}
		if err := c.BodyParser(&body); err != nil || body.Filename == "" {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "filename required")
		}
		ct := body.ContentType
		if ct == "" {
			ct = "image/jpeg"
		}
		result, err := svc.PresignLogoUpload(c.Context(), storeID, body.Filename, ct)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(result)
	}
}
