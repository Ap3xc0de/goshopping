package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/goshopping/core/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func TestLogoutInvalidatesRefreshToken(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	reg := app.POST(t, "/auth/register", map[string]string{
		"email":    "logout-refresh@test.com",
		"password": "password123",
		"name":     "Logout User",
	}, "")
	testutil.AssertStatus(t, reg, http.StatusCreated)
	tokens := testutil.AssertJSON(t, reg)
	refresh, _ := tokens["refresh_token"].(string)
	require.NotEmpty(t, refresh)

	out := app.POST(t, "/auth/logout", map[string]string{
		"refresh_token": refresh,
	}, "")
	testutil.AssertStatus(t, out, http.StatusOK)

	again := app.POST(t, "/auth/refresh", map[string]string{
		"refresh_token": refresh,
	}, "")
	testutil.AssertStatus(t, again, http.StatusUnauthorized)
}

func TestAuthRateLimitUnderBurst(t *testing.T) {
	app := testutil.SetupTestApp(t)
	defer app.Cleanup()

	// Fiber limiter: Max=20/min keyed by IP; httptest shares one IP.
	// Assert at least one 429 in a burst of 30 (window-flake tolerant).
	saw429 := false
	for i := 0; i < 30; i++ {
		resp := app.POST(t, "/auth/login", map[string]string{
			"email":    fmt.Sprintf("burst-%d@test.com", i),
			"password": "wrong-password",
		}, "")
		if resp.StatusCode == http.StatusTooManyRequests {
			saw429 = true
			_ = testutil.AssertJSON(t, resp) // drain body
			break
		}
		_ = testutil.AssertJSON(t, resp)
	}
	assert.True(t, saw429, "expected at least one 429 after bursting past auth limiter (20/min)")
}
