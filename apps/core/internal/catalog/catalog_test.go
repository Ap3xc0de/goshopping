package catalog_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/goshopping/core/internal/catalog"
)

func TestLoad(t *testing.T) {
	tests := []struct {
		name        string
		json        string
		wantErr     bool
		wantValid   []string
		wantInvalid []string
	}{
		{
			name:      "valid catalog with one active template",
			json:      `{"templates":[{"id":"minimal","name":"Minimal","category":["Moda"],"archived":false}]}`,
			wantValid: []string{"minimal"},
		},
		{
			name:        "archived template is not a valid assignment",
			json:        `{"templates":[{"id":"old","name":"Old","archived":true}]}`,
			wantInvalid: []string{"old"},
		},
		{
			name:    "malformed json returns an error",
			json:    `{not valid json`,
			wantErr: true,
		},
		{
			name:    "empty templates list returns an error",
			json:    `{"templates":[]}`,
			wantErr: true,
		},
		{
			name:    "entry with an empty id returns an error",
			json:    `{"templates":[{"id":"","name":"Blank"}]}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := t.TempDir()
			path := filepath.Join(dir, "catalog.json")
			if err := os.WriteFile(path, []byte(tt.json), 0o644); err != nil {
				t.Fatalf("write fixture: %v", err)
			}

			cat, err := catalog.Load(path)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected an error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			for _, id := range tt.wantValid {
				if !cat.IsValid(id) {
					t.Errorf("expected %q to be valid", id)
				}
			}
			for _, id := range tt.wantInvalid {
				if cat.IsValid(id) {
					t.Errorf("expected %q to be invalid (archived)", id)
				}
			}
		})
	}
}

func TestLoad_MissingFileFailsFast(t *testing.T) {
	_, err := catalog.Load(filepath.Join(t.TempDir(), "does-not-exist.json"))
	if err == nil {
		t.Fatal("expected an error for a missing catalog.json, got nil")
	}
}

func TestIsValid_EmptyIDIsNeverValid(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "catalog.json")
	if err := os.WriteFile(path, []byte(`{"templates":[{"id":"minimal","name":"Minimal"}]}`), 0o644); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	cat, err := catalog.Load(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cat.IsValid("") {
		t.Error("an empty template id must never be valid")
	}
}

// TestLoadFromWorkingDir_FindsRealCatalog exercises the real, committed
// apps/core/catalog.json by walking up from this test's own working
// directory (apps/core/internal/catalog), the same way
// resolveMigrationsDir in internal/database/migrations.go resolves
// migrations/ from any package's working directory under `go test`.
func TestLoadFromWorkingDir_FindsRealCatalog(t *testing.T) {
	cat, err := catalog.LoadFromWorkingDir()
	if err != nil {
		t.Fatalf("unexpected error resolving the real catalog.json: %v", err)
	}
	if !cat.IsValid("minimal") {
		t.Error("expected the real, committed catalog.json to include the minimal template")
	}
}

// TestLoadFromWorkingDir_SingleActiveTemplate proves the real, committed
// catalog.json (CATALOG-01, Slice 9) treats `minimal` as the only
// selectable template: the 4 legacy templates were archived, not deleted,
// so this table-driven test also proves boot validation still succeeds
// with 1 active + 4 archived entries (Load returns no error, len > 0).
func TestLoadFromWorkingDir_SingleActiveTemplate(t *testing.T) {
	cat, err := catalog.LoadFromWorkingDir()
	if err != nil {
		t.Fatalf("boot validation failed with 1 active + 4 archived templates: %v", err)
	}

	tests := []struct {
		name      string
		templateID string
		wantValid bool
	}{
		{name: "minimal is the only active template", templateID: "minimal", wantValid: true},
		{name: "vibrant is archived, not selectable", templateID: "vibrant", wantValid: false},
		{name: "elegant is archived, not selectable", templateID: "elegant", wantValid: false},
		{name: "urban is archived, not selectable", templateID: "urban", wantValid: false},
		{name: "fresh is archived, not selectable", templateID: "fresh", wantValid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := cat.IsValid(tt.templateID); got != tt.wantValid {
				t.Errorf("IsValid(%q) = %v, want %v", tt.templateID, got, tt.wantValid)
			}
		})
	}
}
