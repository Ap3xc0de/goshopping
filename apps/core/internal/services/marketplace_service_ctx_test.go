package services_test

import (
	"context"
	"testing"

	"github.com/goshopping/core/internal/services"
	"github.com/goshopping/core/internal/testutil"
)

func TestMarketplaceServiceHonorsContext(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()
	svc := services.NewMarketplaceService(app.DB)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if _, err := svc.ListStores(ctx, 1, 20, "", ""); err == nil {
		t.Error("ListStores: expected error for cancelled context")
	}
	if _, err := svc.ListProducts(ctx, 1, 20, "", ""); err == nil {
		t.Error("ListProducts: expected error for cancelled context")
	}
}
