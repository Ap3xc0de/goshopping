package middleware

import (
	"crypto/subtle"

	"github.com/gofiber/fiber/v2"
)

// originSecretHeader is the header Cloudflare injects via a Transform Rule
// before forwarding storefront traffic to the ALB (see infra Slice 1,
// cloudflare_ruleset.origin_secret_header).
const originSecretHeader = "X-Origin-Shared-Secret"

// RequireOriginSecret returns a middleware that rejects requests that do not
// carry a valid shared secret in the originSecretHeader.
//
// Context (decisions-infra #1098 rev.2): Cloudflare is DNS-only for
// api/admin/superadmin/cdn — only the storefront wildcard is proxied. The
// ALB security group stays open to 0.0.0.0/0 because it is shared by every
// service behind it, so it cannot be restricted to Cloudflare's IP ranges
// without also cutting off the services that bypass the proxy. This header
// is therefore the ONLY defense layer for v1: it makes the Host header
// non-spoofable through a trusted path (a request hitting the ALB directly
// with a forged Host gets 403 for lacking the secret). It does NOT stop the
// ALB from receiving and paying for flood traffic that fails this check —
// that tradeoff is accepted for v1 and revisited in v2 (Cloudflare for SaaS).
//
// Two values are accepted (current and previous) to support secret rotation
// without a hard cutover: during a rotation window both the old and the new
// secret validate, so in-flight ECS tasks that haven't yet reloaded config
// keep working.
//
// When BOTH current and previous are empty, the middleware is a no-op. This
// is intentional: it is the local-development / not-yet-provisioned case.
// Without this escape hatch, every local run (and this project's own test
// suite, which never configures a secret) would be blocked with 403 on every
// public route.
func RequireOriginSecret(current, previous string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if current == "" && previous == "" {
			return c.Next()
		}

		got := c.Get(originSecretHeader)
		if secretMatches(got, current) || (previous != "" && secretMatches(got, previous)) {
			return c.Next()
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "origin secret missing or invalid",
		})
	}
}

// secretMatches compares got against want in constant time, regardless of
// length, so a mismatched length does not leak timing information about how
// close an attacker's guess was to the real secret.
func secretMatches(got, want string) bool {
	if len(got) != len(want) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1
}
