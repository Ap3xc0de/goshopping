package config

import "testing"

func TestParseJWTSecretValue(t *testing.T) {
	if got := parseJWTSecretValue(`{"key":"abc"}`); got != "abc" {
		t.Fatalf("json key: got %q", got)
	}
	if got := parseJWTSecretValue("raw-secret"); got != "raw-secret" {
		t.Fatalf("raw: got %q", got)
	}
}

func TestParseDBPasswordValue(t *testing.T) {
	if got := parseDBPasswordValue(`{"username":"u","password":"p"}`); got != "p" {
		t.Fatalf("json password: got %q", got)
	}
	if got := parseDBPasswordValue("plain"); got != "plain" {
		t.Fatalf("raw: got %q", got)
	}
}
