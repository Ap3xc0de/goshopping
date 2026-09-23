package handlers

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
)

// ListVariants handles GET /stores/:storeId/products/:productId/variants —
// the store's variants for one product as a list (admin view).
func ListVariants(svc *services.VariantService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		productID, err := parseUUIDParam(c, "productId")
		if err != nil {
			return err
		}

		variants, err := svc.ListVariantsByProduct(context.Background(), storeID, productID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.JSON(fiber.Map{
			"variants": variants,
			"count":    len(variants),
		})
	}
}

// CreateVariant handles POST /stores/:storeId/products/:productId/variants.
func CreateVariant(svc *services.VariantService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, productID, err := storeAndProductID(c)
		if err != nil {
			return err
		}

		var req models.CreateVariantRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}

		variant, err := svc.CreateVariant(context.Background(), storeID, productID, req)
		if err != nil {
			if errors.Is(err, services.ErrProductNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "product not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}

		return c.Status(fiber.StatusCreated).JSON(variant)
	}
}

// UpdateVariant handles PATCH /stores/:storeId/products/:productId/variants/:variantId.
// The URL's productId binds the variant to its product (defense in depth —
// store_id comes from StoreContext).
func UpdateVariant(svc *services.VariantService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, productID, err := storeAndProductID(c)
		if err != nil {
			return err
		}
		variantID, err := parseUUIDParam(c, "variantId")
		if err != nil {
			return err
		}

		var req models.UpdateVariantRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}

		variant, err := svc.UpdateVariant(context.Background(), storeID, variantID, req)
		if err != nil {
			if errors.Is(err, services.ErrVariantNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "variant not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		if variant.ProductID != productID {
			return fiber.NewError(fiber.StatusNotFound, "variant not found")
		}

		return c.JSON(variant)
	}
}

// DeleteVariant handles DELETE /stores/:storeId/products/:productId/variants/:variantId.
// Deleting a variant physically removes it (011's status CHECK has no
// 'deleted' value); product stock is untouched — variant stock is independent
// and order snapshots keep old lines readable.
func DeleteVariant(svc *services.VariantService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, productID, err := storeAndProductID(c)
		if err != nil {
			return err
		}
		variantID, err := parseUUIDParam(c, "variantId")
		if err != nil {
			return err
		}

		// Enforce the URL tree: the variant must belong to this product.
		if variant, err := svc.GetVariantByID(context.Background(), storeID, variantID); err != nil || variant.ProductID != productID {
			return fiber.NewError(fiber.StatusNotFound, "variant not found")
		}

		if err := svc.DeleteVariant(context.Background(), storeID, variantID); err != nil {
			if errors.Is(err, services.ErrVariantNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "variant not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.SendStatus(fiber.StatusNoContent)
	}
}
