package database_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
)

// ── REQ-DOMAIN-02 / REQ-CATALOG-06 ───────────────────────────────────────────

func TestStoreTemplateIDDefaultApplied(t *testing.T) {
	db, _ := setupSchemaTestDB(t)
	ctx := context.Background()

	storeID := uuid.New()
	var accountID uuid.UUID
	if err := db.QueryRow(ctx, `
		INSERT INTO accounts (email, password_hash, name, role, status)
		VALUES ($1, 'x', 'Template Default Test Account', 'owner', 'active')
		RETURNING id`,
		fmt.Sprintf("template-default-test-%s@example.test", storeID),
	).Scan(&accountID); err != nil {
		t.Fatalf("insert account: %v", err)
	}

	// Deliberately omit template_id — the column DEFAULT must kick in.
	if _, err := db.Exec(ctx, `
		INSERT INTO stores (id, account_id, name, slug, status)
		VALUES ($1, $2, 'Test Store', $3, 'active')`,
		storeID, accountID, fmt.Sprintf("template-default-%s", storeID),
	); err != nil {
		t.Fatalf("insert store: %v", err)
	}

	var templateID string
	if err := db.QueryRow(ctx, `SELECT template_id FROM stores WHERE id = $1`, storeID).Scan(&templateID); err != nil {
		t.Fatalf("select template_id: %v", err)
	}

	activeCatalogIDs := map[string]bool{
		"minimal": true, "vibrant": true, "elegant": true, "urban": true, "fresh": true,
	}
	if templateID == "" {
		t.Fatal("expected template_id to have a non-empty default value")
	}
	if !activeCatalogIDs[templateID] {
		t.Fatalf("expected default template_id to be one of the 5 active catalog templates, got %q", templateID)
	}
}

func TestStoreTemplateIDExplicitValue(t *testing.T) {
	db, _ := setupSchemaTestDB(t)
	ctx := context.Background()

	storeID := uuid.New()
	var accountID uuid.UUID
	if err := db.QueryRow(ctx, `
		INSERT INTO accounts (email, password_hash, name, role, status)
		VALUES ($1, 'x', 'Template Explicit Test Account', 'owner', 'active')
		RETURNING id`,
		fmt.Sprintf("template-explicit-test-%s@example.test", storeID),
	).Scan(&accountID); err != nil {
		t.Fatalf("insert account: %v", err)
	}

	if _, err := db.Exec(ctx, `
		INSERT INTO stores (id, account_id, name, slug, status, template_id)
		VALUES ($1, $2, 'Test Store', $3, 'active', 'vibrant')`,
		storeID, accountID, fmt.Sprintf("template-explicit-%s", storeID),
	); err != nil {
		t.Fatalf("insert store: %v", err)
	}

	var templateID string
	if err := db.QueryRow(ctx, `SELECT template_id FROM stores WHERE id = $1`, storeID).Scan(&templateID); err != nil {
		t.Fatalf("select template_id: %v", err)
	}
	if templateID != "vibrant" {
		t.Fatalf("expected template_id to store the explicit value 'vibrant', got %q", templateID)
	}
}
