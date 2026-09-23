# Proposal: Public Storefront API with API Keys (Developer API v1)

## Intent

Store owners' clients want to build their own eCommerce apps on top of GoShopping's storefront data. Today `/public/*` routes are gated by `X-Origin-Shared-Secret` (Cloudflare-injected), so only the internal storefront app can call them. Third-party apps need a dedicated, API-key-authenticated surface.

## Scope

### In Scope

- `store_api_keys` table + migration `010` (key stored as SHA-256 hash, display prefix, revoke/expiry support)
- Admin CRUD: `GET/POST /stores/:storeId/api-keys`, `DELETE /stores/:storeId/api-keys/:keyId` (full key shown once on creation)
- `RequireAPIKey` middleware (Bearer token, hash lookup, store-slug binding, active/expiry checks)
- New route group `/api/v1/:storeSlug/*` reusing existing public handlers: config, products (+detail), quote, orders, order status

### Out of Scope

- Rate limiting / usage quotas per key
- Per-key scopes (all keys share full storefront scope in V1)
- Webhooks, API usage dashboard
- Fixing `PublicListProducts` pagination (hardcoded page 1 / 50) — tracked separately
- Customer auth (register/login) for storefront — still guest-only

## Capabilities

### New Capabilities

- `api-key-management`: create/list/revoke store-scoped API keys, hashed storage, one-time plaintext reveal
- `storefront-developer-api`: versioned `/api/v1/:storeSlug/*` endpoints authenticated via Bearer API keys

### Modified Capabilities

None — `openspec/specs/` is empty (no existing capabilities).

## Approach

Reuse the existing `/public` handlers unchanged: they already resolve the store by `:storeSlug` param. Mount a second group `/api/v1/:storeSlug` with `RequireAPIKey(db)` instead of `RequireOriginSecret`. New migration `010_store_api_keys` + `ApiKeyService` (Create/List/Revoke/Validate) + handlers + middleware. Keys are high-entropy (`gsk_` + 40-char random), hashed with SHA-256 (constant-time compare); bcrypt is unnecessary for high-entropy tokens. Admin routes live under the existing `store` group (JWT + `StoreContext`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `migrations/010_store_api_keys.up.sql` | New | API keys table |
| `internal/models/api_key.go` | New | Model + validation |
| `internal/services/api_key_service.go` | New | CRUD + validation logic |
| `internal/handlers/api_keys.go` | New | Admin endpoints |
| `internal/middleware/api_key.go` | New | `RequireAPIKey` |
| `internal/router/router.go` | Modified | Mount `/api/v1/:storeSlug` group + admin api-key routes |
| `internal/testutil` | Modified | `CreateTestAPIKey`, `APIKeyAuthHeader` fixtures |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Key leak via logs | Low | Never log headers; only prefix stored server-side |
| Key from store A used against store B | Low | Middleware binds key to `:storeSlug` and rejects mismatch (403) |
| `last_used_at` write on every request | Med | Update only when stale > 1h; revisit with quotas |
| Orders data exposure | Med | Same data `/public` already serves; docs + TOS notify owners |

## Rollback Plan

Fully additive: new route group + new table, no existing tables altered. Rollback = revert commit; down migration drops `store_api_keys`. `/public/*` behavior untouched.

## Dependencies

- Migrations up to `009` applied
- `make dev` for integration tests (PostgreSQL at `localhost:5434`)

## Success Criteria

- [ ] `make test-core` green with new tests for middleware, service, handlers (Strict TDD)
- [ ] Store owner can create/list/revoke keys; plaintext shown exactly once
- [ ] Valid key → 200s on `/api/v1/...`; missing/invalid/revoked key → 401/403; store mismatch → 403
- [ ] `/public/*` behavior unchanged (origin-secret gating intact)
