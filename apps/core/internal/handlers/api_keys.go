package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/services"
)

// CreateAPIKey handles POST /stores/:storeId/api-keys. The plaintext key is
// returned exactly once, in this response, and is never persisted.
func CreateAPIKey(svc *services.APIKeyService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		var req struct {
			Name string `json:"name"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, "invalid request body")
		}

		plaintext, key, err := svc.Create(c.Context(), storeID, req.Name)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"api_key":   key,
			"plaintext": plaintext,
		})
	}
}

// ListAPIKeys handles GET /stores/:storeId/api-keys and returns the store's
// keys masked: key_hash is never serialized.
func ListAPIKeys(svc *services.APIKeyService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		keys, err := svc.List(c.Context(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
		return c.JSON(keys)
	}
}

// RevokeAPIKey handles DELETE /stores/:storeId/api-keys/:keyId.
func RevokeAPIKey(svc *services.APIKeyService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		keyID, err := uuid.Parse(c.Params("keyId"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid key_id")
		}

		if err := svc.Revoke(c.Context(), storeID, keyID); err != nil {
			if errors.Is(err, services.ErrAPIKeyNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "api key not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.SendStatus(fiber.StatusNoContent)
	}
}
