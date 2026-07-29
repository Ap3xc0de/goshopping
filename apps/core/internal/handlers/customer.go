package handlers

import (
	"errors"
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
)

// ListCustomers handles GET /stores/:storeId/customers
func ListCustomers(svc *services.CustomerService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		page, _ := strconv.Atoi(c.Query("page", "1"))
		perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

		result, err := svc.ListCustomers(storeID, page, perPage, c.Query("search"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(fiber.Map{
			"data":        result.Customers,
			"total":       result.Total,
			"page":        result.Page,
			"per_page":    result.PerPage,
			"total_pages": result.TotalPages,
		})
	}
}

// GetCustomer handles GET /stores/:storeId/customers/:customerId
func GetCustomer(svc *services.CustomerService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, customerID, err := storeAndCustomerID(c)
		if err != nil {
			return err
		}
		cust, err := svc.GetCustomer(storeID, customerID)
		if err != nil {
			if errors.Is(err, services.ErrCustomerNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "customer not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(cust)
	}
}

// CreateCustomer handles POST /stores/:storeId/customers
func CreateCustomer(svc *services.CustomerService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		var req models.CreateCustomerRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		if req.Name == "" {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "name is required")
		}
		cust, err := svc.CreateOrUpsertCustomer(storeID, req)
		if err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(cust)
	}
}

// UpdateCustomer handles PUT /stores/:storeId/customers/:customerId
func UpdateCustomer(svc *services.CustomerService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, customerID, err := storeAndCustomerID(c)
		if err != nil {
			return err
		}
		var req models.UpdateCustomerRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		cust, err := svc.UpdateCustomer(storeID, customerID, req)
		if err != nil {
			if errors.Is(err, services.ErrCustomerNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "customer not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.JSON(cust)
	}
}

// CustomerOrders handles GET /stores/:storeId/customers/:customerId/orders
func CustomerOrders(svc *services.CustomerService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, customerID, err := storeAndCustomerID(c)
		if err != nil {
			return err
		}
		page, _ := strconv.Atoi(c.Query("page", "1"))
		perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

		orders, total, err := svc.GetCustomerOrders(storeID, customerID, page, perPage)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		totalPages := int(math.Ceil(float64(total) / float64(perPage)))
		if totalPages < 1 {
			totalPages = 1
		}
		return c.JSON(fiber.Map{
			"data":        orders,
			"total":       total,
			"page":        page,
			"per_page":    perPage,
			"total_pages": totalPages,
		})
	}
}

func storeAndCustomerID(c *fiber.Ctx) (uuid.UUID, uuid.UUID, error) {
	storeID := middleware.GetStoreID(c)
	customerID, err := uuid.Parse(c.Params("customerId"))
	if err != nil {
		return uuid.Nil, uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "invalid customer_id")
	}
	return storeID, customerID, nil
}
