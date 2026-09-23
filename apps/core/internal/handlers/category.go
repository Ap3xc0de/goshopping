package handlers

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
)

// ListCategories handles GET /stores/:storeId/categories — the store's
// categories as a flat list (admin view, includes parent_id + sort_order so
// the admin UI can render the tree itself).
func ListCategories(svc *services.CategoryService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		categories, err := svc.ListCategories(context.Background(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.JSON(fiber.Map{
			"categories": categories,
			"count":      len(categories),
		})
	}
}

// CreateCategory handles POST /stores/:storeId/categories.
func CreateCategory(svc *services.CategoryService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		var req models.CreateCategoryRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		category, err := svc.CreateCategory(context.Background(), storeID, req)
		if err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}

		return c.Status(fiber.StatusCreated).JSON(category)
	}
}

// UpdateCategory handles PUT /stores/:storeId/categories/:categoryId.
func UpdateCategory(svc *services.CategoryService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		categoryID, err := parseUUIDParam(c, "categoryId")
		if err != nil {
			return err
		}

		var req models.UpdateCategoryRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		category, err := svc.UpdateCategory(context.Background(), storeID, categoryID, req)
		if err != nil {
			if errors.Is(err, services.ErrCategoryNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "category not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}

		return c.JSON(category)
	}
}

// DeleteCategory handles DELETE /stores/:storeId/categories/:categoryId.
// Deleting a parent that still has children returns 409 (REQ: Delete parent
// with children refused).
func DeleteCategory(svc *services.CategoryService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		categoryID, err := parseUUIDParam(c, "categoryId")
		if err != nil {
			return err
		}

		if err := svc.DeleteCategory(context.Background(), storeID, categoryID); err != nil {
			switch {
			case errors.Is(err, services.ErrCategoryNotFound):
				return fiber.NewError(fiber.StatusNotFound, "category not found")
			case errors.Is(err, services.ErrCategoryHasChildren):
				return fiber.NewError(fiber.StatusConflict, "category has children")
			default:
				return fiber.NewError(fiber.StatusInternalServerError, err.Error())
			}
		}

		return c.SendStatus(fiber.StatusNoContent)
	}
}

// parseUUIDParam parses a named route param as UUID, returning a 400 fiber
// error when it is not a valid UUID.
func parseUUIDParam(c *fiber.Ctx, name string) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params(name))
	if err != nil {
		return uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "invalid "+name+" format")
	}
	return id, nil
}
