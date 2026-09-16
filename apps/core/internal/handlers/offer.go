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

// ListOffers handles GET /stores/:storeId/offers
func ListOffers(svc *services.OfferService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		page, _ := strconv.Atoi(c.Query("page", "1"))
		perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

		result, err := svc.ListOffers(c.Context(), storeID, page, perPage)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(fiber.Map{
			"data":        result.Offers,
			"total":       result.Total,
			"page":        result.Page,
			"per_page":    result.PerPage,
			"total_pages": result.TotalPages,
		})
	}
}

// CreateOffer handles POST /stores/:storeId/offers
func CreateOffer(svc *services.OfferService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		var req models.CreateOfferRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		offer, err := svc.CreateOffer(c.Context(), storeID, req)
		if err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(offer)
	}
}

// GetOffer handles GET /stores/:storeId/offers/:offerId
func GetOffer(svc *services.OfferService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, offerID, err := storeAndOfferID(c)
		if err != nil {
			return err
		}
		offer, err := svc.GetOffer(c.Context(), storeID, offerID)
		if err != nil {
			if errors.Is(err, services.ErrOfferNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "offer not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(offer)
	}
}

// UpdateOffer handles PUT /stores/:storeId/offers/:offerId
func UpdateOffer(svc *services.OfferService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, offerID, err := storeAndOfferID(c)
		if err != nil {
			return err
		}
		var req models.UpdateOfferRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}
		offer, err := svc.UpdateOffer(c.Context(), storeID, offerID, req)
		if err != nil {
			if errors.Is(err, services.ErrOfferNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "offer not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		return c.JSON(offer)
	}
}

// DeleteOffer handles DELETE /stores/:storeId/offers/:offerId
func DeleteOffer(svc *services.OfferService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, offerID, err := storeAndOfferID(c)
		if err != nil {
			return err
		}
		if err := svc.DeleteOffer(c.Context(), storeID, offerID); err != nil {
			if errors.Is(err, services.ErrOfferNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "offer not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}

func storeAndOfferID(c *fiber.Ctx) (uuid.UUID, uuid.UUID, error) {
	storeID := middleware.GetStoreID(c)
	offerID, err := uuid.Parse(c.Params("offerId"))
	if err != nil {
		return uuid.Nil, uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "invalid offer_id")
	}
	return storeID, offerID, nil
}
