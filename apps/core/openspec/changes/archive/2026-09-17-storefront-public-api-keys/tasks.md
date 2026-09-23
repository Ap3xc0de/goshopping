# Tasks: Public Storefront API with API Keys

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700–750 |
| 400-line budget risk | High (above 400; below user cap 800) |
| Chained PRs recommended | No (user decision) |
| Suggested split | none — single PR |
| Delivery strategy | ask-on-risk → resolved: size-exception |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Note: user chose single PR with `size:exception` (2026-09-17) — forecast ~700–750 lines, under the session 800-line cap but above the 400-line review guard; maintainer approval assumed.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Migration, model, service, middleware + tests (no routes) | PR 1 | ~440 lines; self-contained, green via SetupTestApp + ApiKeyService.Create (no new fixtures) |
| 2 | Handlers, router group, fixtures, integration matrix, regression | PR 2 | ~270–310 lines; base = PR 1 branch |

## Phase 1: Foundation (PR 1)

- [x] 1.1 RED — `internal/models/api_key_test.go`: GenerateKey `gsk_`+40 hex, HashKey determinism, PrefixOf = first 12 chars, Validate rejects empty/trimmed-empty and >100-char name (spec: Key Name Validation)
- [x] 1.2 GREEN — `internal/models/api_key.go`: `APIKey` struct (`key_hash` tagged `json:"-"`), `Validate()`, `GenerateKey` (crypto/rand 20 bytes → 40 hex), `HashKey` (SHA-256 hex), `PrefixOf`
- [x] 1.3 — `migrations/010_store_api_keys.up.sql`: table per proposal (UNIQUE key_hash, FK→stores.id ON DELETE CASCADE, index on store_id); `.down.sql` drops table

## Phase 2: Service (PR 1)

- [x] 2.1 RED — `internal/services/api_key_service_test.go` (integration, SetupTestApp): Create returns plaintext once and persists hash/prefix/active=true; List exposes no key_hash; Revoke sets revoked_at + active=false; ValidateToken returns typed errors (unknown/revoked/expired → ErrAPIKeyInvalid; wrong slug → ErrAPIKeyStoreMismatch) (spec: api-key-management + storefront-developer-api)
- [x] 2.2 GREEN — `internal/services/api_key_service.go`: `APIKeyService` (pgxpool.Pool, ctx-first) — Create/List/Revoke/ValidateToken (single JOIN, constant-time compare)/TouchLastUsed

## Phase 3: Middleware (PR 1)

- [x] 3.1 RED — `internal/middleware/api_key_test.go`: standalone Fiber test app (RequireAPIKey + dummy handler, not router.go): 401 missing/malformed/unknown/revoked/expired/inactive; 403 cross-store; 200 happy path with store_id in Locals; last_used_at update skipped within 1h (spec: Bearer auth matrix, Throttled update)
- [x] 3.2 GREEN — `internal/middleware/api_key.go`: `RequireAPIKey(svc)` — parse Bearer, hash, ValidateToken; ErrAPIKeyStoreMismatch→403, others→401; throttled TouchLastUsed (>1h stale); set Locals store_id; Next()

## Phase 4: Handlers + Wiring (PR 2)

- [x] 4.1 — `internal/testutil/fixtures.go`: add `CreateTestAPIKey` (insert row, return model + plaintext) and `APIKeyAuthHeader`; CleanDB unchanged (cascade via stores)
- [x] 4.2 RED — `internal/handlers/api_keys_test.go`: create 200 + plaintext shown once, never re-shown; masked list (no key_hash); invalid name 400; revoke 204 then that key 401; non-owner 403; cross-store keyId 404 (spec: api-key-management, all 8 scenarios)
- [x] 4.3 GREEN — `internal/handlers/api_keys.go`: `CreateAPIKey` (200 + plaintext), `ListAPIKeys` (masked), `RevokeAPIKey` (204)
- [x] 4.4 RED — `internal/handlers/public_api_v1_test.go`: `/api/v1/:slug/*` responses match `/public/*` shapes (config/products/orders); `/public/*` gating unchanged (401 without origin secret, 200 with) (spec: storefront-developer-api + /public Unchanged)
- [x] 4.5 GREEN — `internal/router/router.go`: init apiKeySvc; mount `/api/v1/:storeSlug` group with RequireAPIKey over the 6 existing public handlers; add admin GET/POST/DELETE api-key routes on store group

## Phase 5: Verification + Cleanup

- [x] 5.1 — `gofmt -w .`, `go vet ./...`, `go build ./...`
- [x] 5.2 — `make test-core` (PostgreSQL localhost:5434, migrations applied) — full green including both spec matrices
- [x] 5.3 — Document `/api/v1` auth + key lifecycle in project README/API docs if present
