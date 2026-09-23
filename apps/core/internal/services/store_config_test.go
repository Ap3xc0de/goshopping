package services

import "testing"

// store-currency REQ: USD is the only currency, default when omitted. Pure
// unit test, no DB.
func TestResolveStoreCurrency(t *testing.T) {
	tests := []struct {
		name   string
		config []byte
		want   string
	}{
		{"nil config defaults to USD", nil, "USD"},
		{"empty bytes default to USD", []byte(""), "USD"},
		{"empty object defaults to USD", []byte(`{}`), "USD"},
		{"explicit currency is echoed back", []byte(`{"currency":"USD"}`), "USD"},
		{"malformed json defaults to USD", []byte(`not json`), "USD"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ResolveStoreCurrency(tt.config)
			if got != tt.want {
				t.Errorf("ResolveStoreCurrency(%q) = %q, want %q", tt.config, got, tt.want)
			}
		})
	}
}
