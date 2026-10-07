package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/services"
)

// GetMe handles GET /me: upserts the shopper from the validated Cognito
// claims and returns the profile.
func GetMe(svc *services.ShopperService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		shopper, err := svc.UpsertFromClaims(c.UserContext(),
			middleware.GetCognitoSub(c),
			middleware.GetCognitoEmail(c),
			middleware.GetCognitoName(c),
			middleware.GetCognitoProvider(c),
		)
		if err != nil {
			log.Printf("shopper: %s failed: %v", c.Path(), err)
			return fiber.NewError(fiber.StatusInternalServerError, "internal server error")
		}
		return c.JSON(shopper)
	}
}
