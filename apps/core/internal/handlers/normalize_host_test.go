package handlers

import "testing"

// REQ-RESOLVE-02: normalizeHost is a pure function, tested here (package
// handlers, not handlers_test) because it is unexported — same convention
// already used in internal/services for unexported helpers.
func TestNormalizeHost(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"uppercase_host", "TIENDA1.GOSHOPPING.COM", "tienda1.goshopping.com"},
		{"host_with_port", "tienda1.goshopping.com:3000", "tienda1.goshopping.com"},
		{"host_with_www_prefix", "www.tienda1.goshopping.com", "tienda1.goshopping.com"},
		{"host_with_trailing_dot", "tienda1.goshopping.com.", "tienda1.goshopping.com"},
		{
			"host_with_www_and_port_and_trailing_dot_combined",
			"WWW.Tienda1.GoShopping.com:8443.",
			"tienda1.goshopping.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeHost(tt.input); got != tt.want {
				t.Errorf("normalizeHost(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
