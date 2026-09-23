# Design: Public Storefront API with API Keys (Developer API v1)

## Technical Approach

Additively reuse the existing `/public` handlers under a new `/api/v1/:storeSlug` group gated by `RequireAPIKey`. New `store_api_keys` table (migration 010), `models.APIKey`, `services.APIKeyService` (Create/List/Revoke/ValidateToken/TouchLastUsed), and admin handlers under the existing JWT+`StoreContext` `store` group. `/public/*` untouched.

## Architecture Decisions

### ADR-1: Key+slug lookup — single JOIN query

| Option | Tradeoff | Decision |
|--------|----------|----------|
| 2 queries: slug→store_id SELECT, then key-by-hash | Distinct "unknown slug" 404 path | ✗ |
| **1 query BY key_hash JOIN stores, returning `k.*, s.slug`** | 1 round trip on hot path; no-row→401, slug≠param→403; unique key_hash is natural anchor | ✓ |

### ADR-2: Key randomness

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **`crypto/rand` 20 bytes → 40 hex chars + `gsk_`** | 160-bit entropy, stdlib only, matches varchar(64) hash shape | ✓ |
| math/rand / uuid-based | predictable or misaligned with custom format | ✗ |

### ADR-3: Service + thin middleware

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **`ApiKeyService.ValidateToken` (typed errors) + `RequireAPIKey(svc)` mapping to statuses** | follows handlers→services layering; CRUD shared with admin handlers; validation testable beside middleware | ✓ |
| All logic in middleware package | duplicates what admin handlers need; untestable without DB | ✗ |

### ADR-4: Direct handler reuse

Verified against code: `PublicStoreConfig`, `PublicListProducts`, `PublicGetProduct`, `QuoteCart`, `PublicCreateOrder` all read `c.Params("storeSlug")`; group declares the same param name → compatible. `PublicOrderStatus` reads no storeSlug (order-scoped token) — also fine. Handlers re-resolve slug (one extra SELECT/request) — accepted cost of zero duplication.

### ADR-5: Status matrix (per spec)

Missing/malformed header, unknown key, revoked, expired, `active=false` → **401**; key's store ≠ store of `:storeSlug` → **403**.

### ADR-6: Prefix

`prefix = plaintext[:12]` (`gsk_` + 8 hex), persisted at creation. Full key never stored — only SHA-256 (64 hex, constant-time compare, mirroring `origin_secret.go`).

### ADR-7: last_used_at write budget

Throttled `UPDATE` only when `last_used_at IS NULL OR now()-last_used_at > 1h`, before `c.Next()`. Table has **no `updated_at`** → no trigger conflict.

## Data Flow

```
Ext app --Bearer key--> ALB/API --> Fiber /api/v1/:storeSlug
                                     | RequireAPIKey(svc)
                                     1 parse "Authorization: Bearer <key>"  → 401 if missing/malformed
                                     2 SELECT k.*, s.slug
                                         FROM store_api_keys k
                                         JOIN stores s ON s.id=k.store_id
                                         WHERE k.key_hash=$1   [SHA-256(key)]  → 401 if no row
                                     3 revoked/expired/!active                → 401
                                     4 s.slug != :storeSlug                   → 403
                                     5 last_used_at stale>1h → throttled UPDATE
                                     6 c.Locals("store_id", k.store_id)
                                     | c.Next()
                                     mounted public handler (re-resolves slug) → 200 JSON

/public/:storeSlug/* ──> RequireOriginSecret ──> same handlers (unchanged)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `migrations/010_store_api_keys.up.sql` | Create | Table per proposal; `UNIQUE(key_hash)`; `CREATE INDEX idx_store_api_keys_store_id` |
| `migrations/010_store_api_keys.down.sql` | Create | `DROP TABLE IF EXISTS store_api_keys;` |
| `internal/models/api_key.go` | Create | `APIKey` struct (`key_hash` with `json:"-"`), `Validate()` (name trimmed, ≤100), `GenerateKey`/`HashKey`/`PrefixOf` |
| `internal/models/api_key_test.go` | Create | Unit tests (no DB) |
| `internal/services/api_key_service.go` | Create | `ApiKeyService` (pgxpool.Pool, ctx-first) — Create/List/Revoke/ValidateToken/TouchLastUsed |
| `internal/middleware/api_key.go` | Create | `RequireAPIKey(apiKeySvc *services.APIKeyService) fiber.Handler` |
| `internal/handlers/api_keys.go` | Create | `CreateAPIKey` (200+plaintext, per spec), `ListAPIKeys`, `RevokeAPIKey` (204) |
| `internal/handlers/api_keys_test.go` | Create | Admin integration tests |
| `internal/handlers/public_api_v1_test.go` | Create | Mount smoke + 401/403 matrix |
| `internal/router/router.go` | Modify | `apiKeySvc`; `/api/v1/:storeSlug` group; 3 admin routes on `store` group |
| `internal/testutil/fixtures.go` | Modify | `CreateTestAPIKey` (returns plaintext), `APIKeyAuthHeader` |

## Interfaces

```go
type APIKeyService struct{ db *pgxpool.Pool }
func NewAPIKeyService(db *pgxpool.Pool) *APIKeyService
func (s *APIKeyService) Create(ctx context.Context, storeID uuid.UUID, name string) (plaintext string, key *models.APIKey, err error)
func (s *APIKeyService) List(ctx context.Context, storeID uuid.UUID) ([]models.APIKey, error)
func (s *APIKeyService) Revoke(ctx context.Context, storeID, keyID uuid.UUID) error   // UPDATE active=false, revoked_at=now(); 0 rows → ErrAPIKeyNotFound
func (s *APIKeyService) ValidateToken(ctx context.Context, token, slug string) (*models.APIKey, error) // ErrAPIKeyInvalid(→401) | ErrAPIKeyStoreMismatch(→403)
func (s *APIKeyService) TouchLastUsed(ctx context.Context, id uuid.UUID, lastUsedAt time.Time) error
```

## Testing Strategy (Strict TDD; PostgreSQL `localhost:5434`; `go test -p 1 ./internal/...` via `make test-core`)

| Layer | What | How |
|-------|------|-----|
| Unit | GenerateKey format (`gsk_`+40hex), HashKey determinism, PrefixOf length, Validate name (empty/>100) | `models/api_key_test.go`, no DB |
| Integration | Middleware matrix: 401 (missing/malformed/unknown/revoked/expired/inactive), 403 cross-store, 200 happy path | `public_api_v1_test.go` via `SetupTestApp` (project standard for DB middleware) |
| Integration | Create (200, plaintext once), list masked (no `key_hash`), revoke 204 → that key 401, cross-store keyId 404, non-owner 403 | `api_keys_test.go` with `OwnerAuthHeader`/`CreateOtherOwner` |
| Integration | `/api/v1` shapes == `/public` shapes; `/public` gating unchanged | `public_api_v1_test.go` regression |

Fixtures: `CreateTestAPIKey` (INSERT row, return model+plaintext), `APIKeyAuthHeader`. `CleanDB` **unchanged** — `store_api_keys` cascades when `stores` is deleted.

## Migration / Rollout

Fully additive: new table + route group only. Rollback = revert commit; down migration drops the table. No data migration, no feature flag.

## Open Questions

None.
