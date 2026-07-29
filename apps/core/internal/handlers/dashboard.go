package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/services"
)

// GetDashboard handles GET /stores/:storeId/dashboard
func GetDashboard(svc *services.DashboardService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		data, err := svc.GetDashboard(storeID)
		if err != nil {
			log.Printf("[dashboard] GetDashboard error: %v", err)
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(data)
	}
}

// GetReportsSales handles GET /stores/:storeId/reports/sales
func GetReportsSales(svc *services.DashboardService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		report, err := svc.GetReportsSales(storeID, c.Query("start_date"), c.Query("end_date"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(report)
	}
}

// GetReportsProducts handles GET /stores/:storeId/reports/products
func GetReportsProducts(svc *services.DashboardService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		report, err := svc.GetReportsProducts(storeID, c.Query("start_date"), c.Query("end_date"))
		if err != nil {
			log.Printf("[dashboard] GetReportsProducts error: %v", err)
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(report)
	}
}

// GetReportsCustomers handles GET /stores/:storeId/reports/customers
func GetReportsCustomers(svc *services.DashboardService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		report, err := svc.GetReportsCustomers(storeID, c.Query("start_date"), c.Query("end_date"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(report)
	}
}
