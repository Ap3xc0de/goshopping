package handlers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/services"
)

// AdminGetDashboard handles GET /admin/dashboard
func AdminGetDashboard(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		data, err := svc.GetAdminDashboard()
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(data)
	}
}

// AdminListAccounts handles GET /admin/accounts
func AdminListAccounts(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		page, _ := strconv.Atoi(c.Query("page", "1"))
		perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

		result, err := svc.ListAccounts(page, perPage, c.Query("search"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(fiber.Map{
			"data":        result.Accounts,
			"total":       result.Total,
			"page":        result.Page,
			"per_page":    result.PerPage,
			"total_pages": result.TotalPages,
		})
	}
}

// AdminGetAccount handles GET /admin/accounts/:accountId
func AdminGetAccount(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		accountID, err := uuid.Parse(c.Params("accountId"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid account_id")
		}
		detail, err := svc.GetAccount(accountID)
		if err != nil {
			if errors.Is(err, services.ErrAccountNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "account not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(detail)
	}
}

// AdminUpdateAccount handles PATCH /admin/accounts/:accountId
func AdminUpdateAccount(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		accountID, err := uuid.Parse(c.Params("accountId"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid account_id")
		}
		var body struct {
			Status string `json:"status"`
		}
		if err := c.BodyParser(&body); err != nil || body.Status == "" {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "status required")
		}
		acc, err := svc.UpdateAccountStatus(accountID, body.Status)
		if err != nil {
			if errors.Is(err, services.ErrAccountNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "account not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.JSON(acc)
	}
}

// AdminListStores handles GET /admin/stores
func AdminListStores(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		page, _ := strconv.Atoi(c.Query("page", "1"))
		perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

		result, err := svc.ListStores(page, perPage, c.Query("search"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
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

// AdminGetStore handles GET /admin/stores/:storeId
func AdminGetStore(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, err := uuid.Parse(c.Params("storeId"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid store_id")
		}
		st, err := svc.GetStore(storeID)
		if err != nil {
			if errors.Is(err, services.ErrStoreNotFoundAdmin) {
				return fiber.NewError(fiber.StatusNotFound, "store not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(st)
	}
}

// AdminUpdateStore handles PATCH /admin/stores/:storeId
func AdminUpdateStore(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, err := uuid.Parse(c.Params("storeId"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid store_id")
		}
		var body struct {
			Status string `json:"status"`
		}
		if err := c.BodyParser(&body); err != nil || body.Status == "" {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "status required")
		}
		st, err := svc.UpdateStoreStatus(storeID, body.Status)
		if err != nil {
			if errors.Is(err, services.ErrStoreNotFoundAdmin) {
				return fiber.NewError(fiber.StatusNotFound, "store not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.JSON(st)
	}
}

// AdminGetAuditLog handles GET /admin/audit-log
func AdminGetAuditLog(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		page, _ := strconv.Atoi(c.Query("page", "1"))
		perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

		result, err := svc.GetAuditLog(page, perPage,
			c.Query("account_id"), c.Query("store_id"),
			c.Query("action"), c.Query("from"), c.Query("to"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(fiber.Map{
			"data":        result.Entries,
			"total":       result.Total,
			"page":        result.Page,
			"per_page":    result.PerPage,
			"total_pages": result.TotalPages,
		})
	}
}

// AdminIntegrationsHealth handles GET /admin/integrations/health
func AdminIntegrationsHealth(svc *services.AdminService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		health, err := svc.GetIntegrationsHealth()
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(fiber.Map{"data": health})
	}
}
