package services

import (
	"context"
	"testing"
)

func TestShopperService_UpsertRejectsEmptySub(t *testing.T) {
	// The guard runs before any query, so no database is needed.
	svc := NewShopperService(nil)
	shopper, err := svc.UpsertFromClaims(context.Background(), "", "a@example.com", "Ana", "Google")
	if err == nil {
		t.Fatal("expected an error for an empty sub")
	}
	if shopper != nil {
		t.Fatalf("expected no shopper, got %+v", shopper)
	}
}
