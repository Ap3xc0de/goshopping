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

// ListOrders handles GET /stores/:storeId/orders
func ListOrders(svc *services.OrderService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		page, _ := strconv.Atoi(c.Query("page", "1"))
		perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

		result, err := svc.ListOrders(storeID, page, perPage,
			c.Query("status"), c.Query("from"), c.Query("to"), c.Query("customer_id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(fiber.Map{
			"data":        result.Orders,
			"total":       result.Total,
			"page":        result.Page,
			"per_page":    result.PerPage,
			"total_pages": result.TotalPages,
		})
	}
}

// GetOrder handles GET /stores/:storeId/orders/:orderId
func GetOrder(svc *services.OrderService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, orderID, err := storeAndOrderID(c)
		if err != nil {
			return err
		}
		o, err := svc.GetOrder(storeID, orderID)
		if err != nil {
			if errors.Is(err, services.ErrOrderNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "order not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(o)
	}
}

// CreateOrder handles POST /stores/:storeId/orders
func CreateOrder(svc *services.OrderService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		changedBy := middleware.GetAccountID(c)

		var req models.CreateOrderInput
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		if len(req.Items) == 0 {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "items are required")
		}

		var changedByPtr *uuid.UUID
		if changedBy != uuid.Nil {
			changedByPtr = &changedBy
		}

		o, err := svc.CreateOrder(storeID, req, changedByPtr)
		if err != nil {
			if errors.Is(err, services.ErrProductNotFound) {
				return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
			}
			if errors.Is(err, services.ErrCustomerNotFound) {
				return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(o)
	}
}

// ChangeOrderStatus handles PATCH /stores/:storeId/orders/:orderId/status
func ChangeOrderStatus(svc *services.OrderService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, orderID, err := storeAndOrderID(c)
		if err != nil {
			return err
		}
		changedBy := middleware.GetAccountID(c)

		var req models.UpdateOrderStatusInput
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		if req.Status == "" {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "status is required")
		}

		var changedByPtr *uuid.UUID
		if changedBy != uuid.Nil {
			changedByPtr = &changedBy
		}

		o, err := svc.ChangeOrderStatus(storeID, orderID, req, changedByPtr)
		if err != nil {
			if errors.Is(err, services.ErrOrderNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "order not found")
			}
			if errors.Is(err, services.ErrInvalidStatusTransition) {
				return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
			}
			if errors.Is(err, services.ErrInsufficientStock) {
				return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(o)
	}
}

// CancelOrder handles POST /stores/:storeId/orders/:orderId/cancel
func CancelOrder(svc *services.OrderService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, orderID, err := storeAndOrderID(c)
		if err != nil {
			return err
		}
		changedBy := middleware.GetAccountID(c)

		var req models.CancelOrderInput
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}

		var changedByPtr *uuid.UUID
		if changedBy != uuid.Nil {
			changedByPtr = &changedBy
		}

		o, err := svc.CancelOrder(storeID, orderID, req, changedByPtr)
		if err != nil {
			if errors.Is(err, services.ErrOrderNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "order not found")
			}
			if errors.Is(err, services.ErrInvalidStatusTransition) {
				return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(o)
	}
}

// ExportOrders handles GET /stores/:storeId/orders/export
func ExportOrders(svc *services.OrderService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		data, filename, err := svc.ExportOrders(storeID, c.Query("from"), c.Query("to"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		c.Set("Content-Disposition", "attachment; filename="+filename)
		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		return c.Send(data)
	}
}

func storeAndOrderID(c *fiber.Ctx) (uuid.UUID, uuid.UUID, error) {
	storeID := middleware.GetStoreID(c)
	orderID, err := uuid.Parse(c.Params("orderId"))
	if err != nil {
		return uuid.Nil, uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "invalid order_id")
	}
	return storeID, orderID, nil
}
