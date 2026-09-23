package services

import (
	"testing"
	"time"
)

// store-newsletter REQ: rate limiting — fixed window, 5/min per key
// (design decision 4). Pure unit test with an injected clock, no DB.
func TestNewsletterRateLimiter_Allow(t *testing.T) {
	current := time.Now()
	clock := func() time.Time { return current }

	l := &NewsletterRateLimiter{
		windows: make(map[string]*rateWindow),
		max:     3,
		window:  time.Minute,
		now:     clock,
	}

	key := "store-1|127.0.0.1"
	for i := 0; i < 3; i++ {
		if !l.Allow(key) {
			t.Fatalf("request %d should be allowed within the window", i+1)
		}
	}
	if l.Allow(key) {
		t.Fatal("4th request within the same window should be blocked")
	}

	// Advance past the window: the limiter resets.
	current = current.Add(time.Minute + time.Second)
	if !l.Allow(key) {
		t.Fatal("request after the window resets should be allowed")
	}

	// A different key has its own independent window.
	if !l.Allow("store-2|127.0.0.1") {
		t.Fatal("a different key must not be affected by another key's window")
	}
}

func TestNewNewsletterRateLimiter_DefaultPolicy(t *testing.T) {
	l := NewNewsletterRateLimiter()
	key := "store-x|1.2.3.4"
	for i := 0; i < newsletterRateLimitMax; i++ {
		if !l.Allow(key) {
			t.Fatalf("request %d should be allowed under the default 5/min policy", i+1)
		}
	}
	if l.Allow(key) {
		t.Fatal("request beyond the default max should be blocked")
	}
}
