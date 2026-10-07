package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/services"
)

// MarketplaceListStores handles GET /marketplace/stores
func MarketplaceListStores(svc *services.MarketplaceService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		result, err := svc.ListStores(c.UserContext(), c.QueryInt("page", 1), c.QueryInt("per_page", 20), c.Query("search"), c.Query("category"))
		if err != nil {
			log.Printf("marketplace: %s failed: %v", c.Path(), err)
			return fiber.NewError(fiber.StatusInternalServerError, "internal server error")
		}
		return c.JSON(fiber.Map{
			"data":        result.Stores,
			"total":       result.Total,
			"page":        result.Page,
			"per_page":    result.PerPage,
			"total_pages": result.TotalPages,
		})
	}
}

// MarketplaceListProducts handles GET /marketplace/products
func MarketplaceListProducts(svc *services.MarketplaceService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		result, err := svc.ListProducts(c.UserContext(), c.QueryInt("page", 1), c.QueryInt("per_page", 20), c.Query("search"), c.Query("category"))
		if err != nil {
			log.Printf("marketplace: %s failed: %v", c.Path(), err)
			return fiber.NewError(fiber.StatusInternalServerError, "internal server error")
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
