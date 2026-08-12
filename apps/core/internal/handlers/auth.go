package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/goshopping/core/internal/models"
	"github.com/goshopping/core/internal/services"
)

// Register handles POST /auth/register.
func Register(svc *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req models.RegisterRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		if err := validateRegisterRequest(req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		resp, err := svc.Register(req)
		if err != nil {
			if errors.Is(err, services.ErrEmailTaken) {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "email already registered",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "could not create account",
			})
		}

		return c.Status(fiber.StatusCreated).JSON(resp)
	}
}

// Login handles POST /auth/login.
func Login(svc *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req models.LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		resp, err := svc.Login(req)
		if err != nil {
			if errors.Is(err, services.ErrInvalidCredentials) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "invalid email or password",
				})
			}
			if errors.Is(err, services.ErrAccountSuspended) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "account is not active",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "could not authenticate",
			})
		}

		return c.JSON(resp)
	}
}

// Refresh handles POST /auth/refresh.
func Refresh(svc *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req models.RefreshRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		if req.RefreshToken == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "refresh_token is required",
			})
		}

		resp, err := svc.RefreshToken(req.RefreshToken)
		if err != nil {
			if errors.Is(err, services.ErrInvalidToken) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "invalid or expired refresh token",
				})
			}
			if errors.Is(err, services.ErrAccountSuspended) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "account is not active",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "could not refresh token",
			})
		}

		return c.JSON(resp)
	}
}

// Logout handles POST /auth/logout.
func Logout(svc *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req models.RefreshRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		if err := svc.Logout(req.RefreshToken); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "could not logout",
			})
		}

		return c.JSON(fiber.Map{"ok": true})
	}
}

func validateRegisterRequest(req models.RegisterRequest) error {
	if req.Email == "" {
		return errors.New("email is required")
	}
	if req.Password == "" || len(req.Password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	if req.Name == "" || len(req.Name) < 2 {
		return errors.New("name must be at least 2 characters")
	}
	return nil
}
