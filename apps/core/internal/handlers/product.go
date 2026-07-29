package handlers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
)

// ListProducts handles GET /stores/:storeId/products
func ListProducts(svc *services.ProductService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		page, _ := strconv.Atoi(c.Query("page", "1"))
		perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

		result, err := svc.ListProducts(storeID, page, perPage,
			c.Query("category"), c.Query("status"), c.Query("search"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(fiber.Map{
			"data":        result.Products,
			"total":       result.Total,
			"page":        result.Page,
			"per_page":    result.PerPage,
			"total_pages": result.TotalPages,
		})
	}
}

// GetProduct handles GET /stores/:storeId/products/:productId
func GetProduct(svc *services.ProductService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, productID, err := storeAndProductID(c)
		if err != nil {
			return err
		}
		p, err := svc.GetProduct(storeID, productID)
		if err != nil {
			if errors.Is(err, services.ErrProductNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "product not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(p)
	}
}

// CreateProduct handles POST /stores/:storeId/products
func CreateProduct(svc *services.ProductService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		var req models.CreateProductRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		if req.Name == "" {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "name is required")
		}
		p, err := svc.CreateProduct(storeID, req)
		if err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(p)
	}
}

// UpdateProduct handles PUT /stores/:storeId/products/:productId
func UpdateProduct(svc *services.ProductService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, productID, err := storeAndProductID(c)
		if err != nil {
			return err
		}
		var req models.UpdateProductRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		p, err := svc.UpdateProduct(storeID, productID, req)
		if err != nil {
			if errors.Is(err, services.ErrProductNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "product not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.JSON(p)
	}
}

// DeleteProduct handles DELETE /stores/:storeId/products/:productId
func DeleteProduct(svc *services.ProductService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, productID, err := storeAndProductID(c)
		if err != nil {
			return err
		}
		if err := svc.DeleteProduct(storeID, productID); err != nil {
			if errors.Is(err, services.ErrProductNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "product not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}

// BulkImportProducts handles POST /stores/:storeId/products/import
func BulkImportProducts(svc *services.ProductService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		file, err := c.FormFile("file")
		if err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "file field required")
		}
		f, err := file.Open()
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "cannot open file")
		}
		defer f.Close()

		result, err := svc.BulkImportProducts(storeID, f)
		if err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.Status(fiber.StatusOK).JSON(result)
	}
}

// ProductImageUpload handles POST /stores/:storeId/products/:productId/images
func ProductImageUpload(svc *services.ProductService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, productID, err := storeAndProductID(c)
		if err != nil {
			return err
		}
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
		result, err := svc.GetProductImageUploadURL(storeID, productID, body.Filename, ct)
		if err != nil {
			if errors.Is(err, services.ErrProductNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "product not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(result)
	}
}

func storeAndProductID(c *fiber.Ctx) (uuid.UUID, uuid.UUID, error) {
	storeID := middleware.GetStoreID(c)
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return uuid.Nil, uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "invalid product_id")
	}
	return storeID, productID, nil
}
