package handlers

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PublicShippingZoneRef is the reduced zone view nested in PublicShippingMethod.
type PublicShippingZoneRef struct {
	Name string `json:"name"`
}

// PublicShippingMethod is the public-facing shipping method shape (design:
// "[{zone:{name},code,name,base_price,weight_rate}]").
type PublicShippingMethod struct {
	Zone       PublicShippingZoneRef `json:"zone"`
	Code       string                `json:"code"`
	Name       string                `json:"name"`
	BasePrice  models.Money          `json:"base_price"`
	WeightRate models.Money          `json:"weight_rate"`
}

func toPublicShippingMethod(mw services.MethodWithZone) PublicShippingMethod {
	return PublicShippingMethod{
		Zone:       PublicShippingZoneRef{Name: mw.ZoneName},
		Code:       mw.Method.Code,
		Name:       mw.Method.Name,
		BasePrice:  mw.Method.BasePrice,
		WeightRate: mw.Method.WeightRate,
	}
}

// PublicListShippingMethods handles GET /public/:storeSlug/shipping-methods
// (also mounted at /api/v1/:storeSlug/shipping-methods) — active methods only
// (shipping-zones REQ: List Public Methods).
func PublicListShippingMethods(db *pgxpool.Pool, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		slug := c.Params("storeSlug")
		storeID, err := resolveStoreBySlug(c.Context(), db, slug)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "store not found")
		}

		methodsWithZone, err := services.NewShippingService(db).ListActiveMethods(c.Context(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		public := make([]PublicShippingMethod, 0, len(methodsWithZone))
		for _, mw := range methodsWithZone {
			public = append(public, toPublicShippingMethod(mw))
		}
		return c.JSON(public)
	}
}

// ── Admin CRUD (design: minimal, no admin UI this change) ───────────────────

// ListShippingZones handles GET /stores/:storeId/shipping-zones — zones with
// their methods nested (admin view, any status).
func ListShippingZones(svc *services.ShippingService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		zones, err := svc.ListZonesWithMethods(context.Background(), storeID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.JSON(fiber.Map{
			"zones": zones,
			"count": len(zones),
		})
	}
}

// CreateShippingZone handles POST /stores/:storeId/shipping-zones.
func CreateShippingZone(svc *services.ShippingService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)

		var req models.CreateShippingZoneRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		zone, err := svc.CreateZone(context.Background(), storeID, req)
		if err != nil {
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}

		return c.Status(fiber.StatusCreated).JSON(zone)
	}
}

// CreateShippingMethod handles POST /stores/:storeId/shipping-zones/:zoneId/methods.
func CreateShippingMethod(svc *services.ShippingService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		zoneID, err := parseUUIDParam(c, "zoneId")
		if err != nil {
			return err
		}

		var req models.CreateShippingMethodRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		method, err := svc.CreateMethod(context.Background(), storeID, zoneID, req)
		if err != nil {
			if errors.Is(err, services.ErrShippingZoneNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "shipping zone not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}

		return c.Status(fiber.StatusCreated).JSON(method)
	}
}

// UpdateShippingMethod handles PUT /stores/:storeId/shipping-zones/:zoneId/methods/:methodId.
// The URL's zoneId binds the method to its zone (defense in depth — store_id
// comes from StoreContext).
func UpdateShippingMethod(svc *services.ShippingService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		zoneID, err := parseUUIDParam(c, "zoneId")
		if err != nil {
			return err
		}
		methodID, err := parseUUIDParam(c, "methodId")
		if err != nil {
			return err
		}

		var req models.UpdateShippingMethodRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		method, err := svc.UpdateMethod(context.Background(), storeID, methodID, req)
		if err != nil {
			if errors.Is(err, services.ErrShippingMethodNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "shipping method not found")
			}
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		}
		if method.ZoneID != zoneID {
			return fiber.NewError(fiber.StatusNotFound, "shipping method not found")
		}

		return c.JSON(method)
	}
}

// DeleteShippingMethod handles DELETE /stores/:storeId/shipping-zones/:zoneId/methods/:methodId.
func DeleteShippingMethod(svc *services.ShippingService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := middleware.GetStoreID(c)
		zoneID, err := parseUUIDParam(c, "zoneId")
		if err != nil {
			return err
		}
		methodID, err := parseUUIDParam(c, "methodId")
		if err != nil {
			return err
		}

		// Enforce the URL tree: the method must belong to this zone.
		if method, err := svc.GetMethodByID(context.Background(), storeID, methodID); err != nil || method.ZoneID != zoneID {
			return fiber.NewError(fiber.StatusNotFound, "shipping method not found")
		}

		if err := svc.DeleteMethod(context.Background(), storeID, methodID); err != nil {
			if errors.Is(err, services.ErrShippingMethodNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "shipping method not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.SendStatus(fiber.StatusNoContent)
	}
}
