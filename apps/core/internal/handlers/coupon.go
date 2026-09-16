package handlers

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
)

// ListCoupons returns all coupons for a store.
func ListCoupons(svc *services.CouponService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, _ := uuid.Parse(c.Params("storeId"))

		coupons, err := svc.ListCoupons(context.Background(), storeID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(map[string]string{"error": err.Error()})
		}

		return c.JSON(map[string]interface{}{
			"coupons": coupons,
			"count":   len(coupons),
		})
	}
}

// GetCoupon returns a single coupon.
func GetCoupon(svc *services.CouponService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, _ := uuid.Parse(c.Params("storeId"))
		couponID, _ := uuid.Parse(c.Params("couponId"))

		coupon, err := svc.GetCoupon(context.Background(), storeID, couponID)
		if err != nil {
			if errors.Is(err, services.ErrCouponNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(map[string]string{"error": "coupon not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(map[string]string{"error": err.Error()})
		}

		return c.JSON(coupon)
	}
}

// CreateCoupon creates a new coupon.
func CreateCoupon(svc *services.CouponService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, _ := uuid.Parse(c.Params("storeId"))

		var req models.CreateCouponRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(map[string]string{"error": "invalid request"})
		}

		coupon, err := svc.CreateCoupon(context.Background(), storeID, req)
		if err != nil {
			// Check if it's validation error
			if _, ok := err.(models.ValidationErrors); ok {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{"error": err.Error()})
			}
			if errors.Is(err, services.ErrCouponCodeTaken) {
				return c.Status(fiber.StatusConflict).JSON(map[string]string{"error": err.Error()})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(map[string]string{"error": err.Error()})
		}

		return c.Status(fiber.StatusCreated).JSON(coupon)
	}
}

// UpdateCoupon updates a coupon.
func UpdateCoupon(svc *services.CouponService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, _ := uuid.Parse(c.Params("storeId"))
		couponID, _ := uuid.Parse(c.Params("couponId"))

		var req models.UpdateCouponRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(map[string]string{"error": "invalid request"})
		}

		coupon, err := svc.UpdateCoupon(context.Background(), storeID, couponID, req)
		if err != nil {
			if errors.Is(err, services.ErrCouponNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(map[string]string{"error": "coupon not found"})
			}
			if _, ok := err.(models.ValidationErrors); ok {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(map[string]string{"error": err.Error()})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(map[string]string{"error": err.Error()})
		}

		return c.JSON(coupon)
	}
}

// DeleteCoupon deletes a coupon.
func DeleteCoupon(svc *services.CouponService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID, _ := uuid.Parse(c.Params("storeId"))
		couponID, _ := uuid.Parse(c.Params("couponId"))

		err := svc.DeleteCoupon(context.Background(), storeID, couponID)
		if err != nil {
			if errors.Is(err, services.ErrCouponNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(map[string]string{"error": "coupon not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(map[string]string{"error": err.Error()})
		}

		return c.SendStatus(fiber.StatusNoContent)
	}
}
