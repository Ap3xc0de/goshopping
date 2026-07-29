package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/goshopping/core/internal/config"
	"github.com/goshopping/core/internal/database"
	"github.com/goshopping/core/internal/middleware"
	"github.com/goshopping/core/internal/router"
	"github.com/goshopping/core/internal/services"
)

func main() {
	// 1. Load config
	cfg := config.Load()

	// 2. Connect to database
	db := database.Connect(cfg)
	defer db.Close()

	// 3. Run migrations
	database.RunMigrations(cfg)

	// 4. Initialise AWS services
	eventSvc := services.NewEventService(cfg)

	// 5. Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: errorHandler,
		// Never expose internal errors in responses
		DisableStartupMessage: false,
	})

	// 6. Global middleware
	app.Use(middleware.Logger())
	app.Use(middleware.CORS(cfg))
	app.Use(recover.New(recover.Config{
		EnableStackTrace: cfg.AppEnv == "development",
	}))

	// 7. Setup routes
	router.Setup(app, cfg, db, eventSvc)

	// 8. Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("shutting down server...")
		if err := app.Shutdown(); err != nil {
			log.Printf("error during shutdown: %v", err)
		}
	}()

	// 9. Start server
	log.Printf("starting Go Shopping Core API on :%s (env=%s)", cfg.Port, cfg.AppEnv)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// errorHandler returns structured JSON errors and never exposes stack traces.
func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	msg := "internal server error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		msg = e.Message
	}

	return c.Status(code).JSON(fiber.Map{
		"error": msg,
	})
}
