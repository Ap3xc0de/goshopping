# ADR-009: Single-Layer Origin Defense for the Storefront Wildcard (Shared Secret Header)

**Status**: Accepted
**Date**: 2026-09
**Deciders**: Go Shopping Engineering

---

## Context

`storefront-templates-multidomain` (Slice 1) introduces per-store hostnames resolved by `Host`
(e.g. `mystore.goshopping.com`). Resolving tenant identity from `Host` means a forged `Host`
header sent straight to the ALB — bypassing DNS entirely — could impersonate any store.

The obvious mitigation is to put Cloudflare in front of the ALB (WAF, rate limiting) and restrict
the ALB security group to Cloudflare's published IP ranges, so only traffic that actually went
through Cloudflare can reach the origin.

That mitigation assumes Cloudflare is a reverse proxy for the traffic in question. It verifiably
is not, for four of our five hostnames: `infra/environments/staging/main.tf` shows `api`, `admin`,
`superadmin`, and `cdn` all as `cloudflare_dns_record` with `proxied = false` — DNS-only ("grey
cloud"). Cloudflare resolves the name and steps aside; the client connects directly to the ALB's
IP. Only the new storefront wildcard record is being set to `proxied = true` in this change.

The ALB's security group is a **single resource shared by every listener rule** (core/API, admin,
superadmin, storefront). Restricting it to Cloudflare's IP ranges would cut off all direct traffic
to api/admin/superadmin — which is real, legitimate traffic today, not a hypothetical. Splitting
the ALB per service was rejected as disproportionate: it multiplies infrastructure (new ALBs,
new certs, new DNS) to solve a problem scoped to one hostname pattern.

---

## Decision

Enable Cloudflare proxying (`proxied = true`) **only** on the new storefront wildcard DNS record.
`api`, `admin`, `superadmin`, and `cdn` remain `proxied = false`, unchanged.

The ALB security group **stays open to `0.0.0.0/0`** on 443/80. It cannot be narrowed to
Cloudflare's ranges without also blocking admin/superadmin/api, which do not go through
Cloudflare.

The **only** defense layer for v1 is a shared secret header:

1. A Cloudflare Transform Rule (`cloudflare_ruleset`, phase `http_request_late_transform`) injects
   `X-Origin-Shared-Secret` on every request Cloudflare proxies in the zone. In practice this only
   ever fires for the storefront wildcard, since it is the only proxied record.
2. `apps/core`'s `middleware.RequireOriginSecret` validates that header against two secrets
   (current + previous, to support rotation) using `crypto/subtle.ConstantTimeCompare`, and
   returns 403 if neither matches.
3. Both secret values live in the existing `goshopping/third-party-api-keys` Secrets Manager
   secret (two new JSON keys), loaded by `Config.loadFromAWS()` following the same pattern as
   every other secret-backed config field.
4. When no secret is configured (local development, or before this Terraform change ships), the
   middleware is a deliberate no-op — it does not block requests. Without this, every local `npm
   run dev` / `go run` and this repo's own Go test suite would 403 on every public route.

An ACM certificate SAN for the wildcard pattern (`*.<env>.<base_domain>`) was added to the existing
frontend certificate so the ALB can present a matching certificate once Cloudflare validates it
under "Full (strict)" SSL mode — without it, Cloudflare would reject the origin's certificate for
any per-store hostname. Setting the zone's SSL/TLS mode to "Full (strict)" itself is a manual step
in the Cloudflare dashboard, done once before this record's `proxied` flag is flipped — it was not
encoded as a `cloudflare_zone_setting` Terraform resource in this change, to avoid guessing an
unverified provider schema for a zone-wide setting outside this task's explicit scope.

---

## What this protects, and what it does not

**Protects**: a request hitting the ALB directly with a forged `Host` header gets 403, because it
lacks the secret only Cloudflare's Transform Rule can inject. This closes the specific risk that
motivated this ADR — resolving tenant identity from `Host` without any verification of where the
request actually came from.

**Does not protect**: the ALB still receives and pays for the network cost of a flood of requests
against the storefront wildcard, even though each one gets a fast 403. There is no rate limiting
or WAF at the AWS network layer for this path (Cloudflare's WAF/rate-limiting *does* apply, since
this hostname is proxied — but a client that skips Cloudflare and hits the ALB IP directly bypasses
that too, arriving at the ALB and only then getting rejected by the header check).

---

## Consequences

### Positive
- Closes the `Host`-spoofing risk for the one hostname pattern that resolves tenant identity from
  `Host`, with a minimal, auditable change (one DNS record, one header, one middleware).
- Blast radius is exactly the storefront wildcard — api/admin/superadmin/cdn are provably
  unaffected (same `proxied = false` they had before this change).
- Secret rotation has no hard cutover: both `origin_shared_secret_current` and `_previous` are
  accepted simultaneously during a rotation window.
- `RequireOriginSecret`'s no-op-when-unconfigured behavior means this change ships without
  breaking local development or CI before the Terraform side is applied.

### Negative
- The ALB security group remains open to `0.0.0.0/0`. A flood aimed at the storefront wildcard's
  IP still reaches and costs the ALB, even though it's rejected with 403 immediately after.
- Two independent Terraform resources (the Secrets Manager value and the Cloudflare Transform
  Rule) must be rotated together, in the same `apply`, or the header and the value the origin
  expects will disagree.
- The Cloudflare zone SSL/TLS mode ("Full (strict)") is a manual dashboard step, not
  Terraform-managed — a real gap versus full declarative reproducibility, accepted here rather
  than risk an unverified resource schema.

### Neutral
- No change to how api/admin/superadmin/cdn are served — same DNS mode, same security group,
  same listener rules (aside from the new explicit `core` rule at priority 99, needed only because
  the storefront rule's `host_header` becomes a wildcard — see the corresponding Terraform
  comments in `infra/modules/ecs/main.tf`).

---

## Alternatives Considered

| Alternative | Rejected because |
|-------------|-------------------|
| Proxy all 5 DNS records + restrict SG to Cloudflare IP ranges | Strongest posture, but changes the network path for admin/superadmin/api simultaneously — new TLS termination point, new upload limits, new caching behavior, real risk of breaking services not in scope for this change. |
| Proxy storefront + api, restrict SG | SG still can't be restricted while admin/superadmin bypass the proxy — same single-layer outcome, but touches api's network path for no added protection. |
| Do nothing (leave `Host`-based resolution unauthenticated) | The exact risk this ADR exists to close; also not viable long-term, since v2 (Cloudflare for SaaS / custom hostnames) requires proxying regardless. |
| Restrict the SG to Cloudflare IP ranges without enabling any proxying | Would immediately block all legitimate traffic to every service, since none of it currently arrives from Cloudflare's network. |

---

## Revisit in v2

Cloudflare for SaaS / custom hostnames (out of scope here) will proxy more traffic by
construction. When that ships, revisit whether the ALB security group can finally be restricted to
Cloudflare's IP ranges without cutting off any service that still bypasses the proxy.
