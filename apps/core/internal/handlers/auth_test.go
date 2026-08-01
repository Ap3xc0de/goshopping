package handlers_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

func TestLoginRejectsSuspendedAccount(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	email := "suspended@test.com"
	password := "password123"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt: %v", err)
	}

	_, err = app.DB.Exec(context.Background(), `
		INSERT INTO accounts (email, password_hash, name, role, status)
		VALUES ($1, $2, 'Suspended User', 'owner', 'suspended')`,
		email, string(hash),
	)
	if err != nil {
		t.Fatalf("insert account: %v", err)
	}

	resp := app.POST(t, "/auth/login", map[string]string{
		"email":    email,
		"password": password,
	}, "")
	testutil.AssertStatus(t, resp, http.StatusForbidden)
	data := testutil.AssertJSON(t, resp)
	assert.Equal(t, "account is not active", data["error"])
}
