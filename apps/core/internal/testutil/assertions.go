package testutil

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// AssertStatus asserts the HTTP status code matches expected.
func AssertStatus(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	assert.Equal(t, expected, resp.StatusCode,
		"unexpected status code (expected %d, got %d)", expected, resp.StatusCode)
}

// AssertJSON reads and closes the response body, unmarshals JSON, and returns the map.
func AssertJSON(t *testing.T, resp *http.Response) map[string]interface{} {
	t.Helper()
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err, "read response body")

	var result map[string]interface{}
	require.NoError(t, json.Unmarshal(body, &result),
		"parse JSON from body: %s", string(body))
	return result
}

// AssertError asserts the status code and that the "error" field contains msgSubstring.
func AssertError(t *testing.T, resp *http.Response, status int, msgSubstring string) {
	t.Helper()
	AssertStatus(t, resp, status)
	data := AssertJSON(t, resp)
	errMsg, _ := data["error"].(string)
	assert.Contains(t, errMsg, msgSubstring,
		"error message %q should contain %q", errMsg, msgSubstring)
}

// AssertPaginated asserts the standard pagination envelope is present and total matches.
func AssertPaginated(t *testing.T, data map[string]interface{}, expectedTotal int) {
	t.Helper()
	_, hasData := data["data"]
	assert.True(t, hasData, "response should have 'data' field")
	assert.Equal(t, float64(expectedTotal), data["total"],
		"unexpected total (expected %d)", expectedTotal)
	_, hasPage := data["page"]
	_, hasPerPage := data["per_page"]
	_, hasTotalPages := data["total_pages"]
	assert.True(t, hasPage, "response should have 'page' field")
	assert.True(t, hasPerPage, "response should have 'per_page' field")
	assert.True(t, hasTotalPages, "response should have 'total_pages' field")
}

// AssertNoError is a convenience wrapper for require.NoError with a message.
func AssertNoError(t *testing.T, err error, msgAndArgs ...interface{}) {
	t.Helper()
	require.NoError(t, err, msgAndArgs...)
}
