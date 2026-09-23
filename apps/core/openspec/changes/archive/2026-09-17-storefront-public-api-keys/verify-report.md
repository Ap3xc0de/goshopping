## Verification Report

**Change**: storefront-public-api-keys
**Version**: delta specs (api-key-management, storefront-developer-api)
**Mode**: Strict TDD (openspec/config.yaml `strict_tdd: true`; runner available)
**Date**: 2026-09-17
**Persistence**: hybrid (this file + Engram `sdd/storefront-public-api-keys/verify-report`)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 15 |
| Tasks complete | 15 |
| Tasks incomplete | 0 |
| Delivery strategy | single PR, size:exception (user-approved 2026-09-17; forecast ~700–750 lines, high 400-line risk, under session 800 cap) |

All 15 tasks in `openspec/changes/storefront-public-api-keys/tasks.md` are `[x]`. Verified per task:

| Task | Status | Evidence |
|------|--------|----------|
| 1.1 RED models test | ✅ | `internal/models/api_key_test.go` exists; 4 funcs / 12 subtests pass fresh |
| 1.2 GREEN models | ✅ | `internal/models/api_key.go` — APIKey struct (`key_hash` `json:"-"`), Validate, GenerateKey (crypto/rand 20B→40 hex), HashKey (SHA-256), PrefixOf |
| 1.3 migration 010 | ✅ | up/down files exist; DB at `schema_migrations` version 10, dirty=false; `\d store_api_keys` matches spec |
| 2.1 RED service test | ✅ | `internal/services/api_key_service_test.go` exists; 4 funcs / 18 subtests pass fresh |
| 2.2 GREEN service | ✅ | `ApiKeyService` Create/List/Revoke/ValidateToken (single JOIN + `subtle.ConstantTimeCompare`)/TouchLastUsed; typed errors |
| 3.1 RED middleware test | ✅ | `internal/middleware/api_key_test.go` exists; 11 subtests pass fresh (not skipped — DB_HOST set) |
| 3.2 GREEN middleware | ✅ | `RequireAPIKey(svc)`: Bearer parse, 401/403 matrix, throttled `TouchLastUsed` (>1h const), Locals `store_id`, `Next()` |
| 4.1 fixtures | ✅ | `CreateTestAPIKey` (model+plaintext), `APIKeyAuthHeader`; `CleanDB` unchanged (cascade via stores) |
| 4.2 RED admin handlers test | ✅ | `api_keys_test.go` exists; 11 subtests pass fresh |
| 4.3 GREEN admin handlers | ✅ | CreateAPIKey (200 + plaintext once), ListAPIKeys (masked), RevokeAPIKey (204); wired on `store` group |
| 4.4 RED v1 handlers test | ✅ | `public_api_v1_test.go` exists; 14 test cases pass fresh |
| 4.5 GREEN router | ✅ | `apiKeySvc`; `/api/v1/:storeSlug` group w/ RequireAPIKey over 6 existing public handlers; admin GET/POST/DELETE `/api-keys` |
| 5.1 gofmt/vet/build | ✅ | `gofmt -l` empty on 11 changed Go files; `go vet ./...` exit 0; `go build ./...` exit 0 |
| 5.2 full suite | ✅ | `go test -p 1 ./internal/... -timeout 120s` exit 0, all 8 packages ok |
| 5.3 docs | ✅ | root README.md has "API Pública para Desarrolladores (v1)" section (routes, lifecycle, 401/403 matrix) |

### Build & Tests Execution

**Build**: ✅ Passed
```text
go build ./...                 → exit 0 (no output)
```

**Vet**: ✅ Passed
```text
go vet ./...                   → exit 0 (no output)
```

**Format**: ✅ Clean
```text
gofmt -l internal/models/api_key.go internal/models/api_key_test.go
      internal/services/api_key_service.go internal/services/api_key_service_test.go
      internal/middleware/api_key.go internal/middleware/api_key_test.go
      internal/handlers/api_keys.go internal/handlers/api_keys_test.go
      internal/handlers/public_api_v1_test.go internal/testutil/fixtures.go
      internal/router/router.go        → empty output
```

**Tests**: ✅ full suite green (env: DB_HOST=127.0.0.1, DB_PORT=5434, DB_USER=goshopping, DB_PASSWORD=localdev123, DB_NAME=goshopping, DB_SSL_MODE=disable)
```text
go test -p 1 ./internal/... -timeout 120s     → exit 0
ok  github.com/goshopping/core/internal/catalog      (cached)
ok  github.com/goshopping/core/internal/config       0.945s
ok  github.com/goshopping/core/internal/database     (cached)
ok  github.com/goshopping/core/internal/handlers     6.756s
ok  github.com/goshopping/core/internal/middleware   (cached)
ok  github.com/goshopping/core/internal/models       (cached)
?   github.com/goshopping/core/internal/router      [no test files]
ok  github.com/goshopping/core/internal/services     2.323s
?   github.com/goshopping/core/internal/testutil    [no test files]
```

**Fresh re-run of changed packages** (`-count=1`, cache bypass — GREEN confirmation used for TDD cross-reference):
```text
go test -count=1 -p 1 ./internal/models ./internal/services ./internal/middleware ./internal/handlers -timeout 120s → exit 0
ok  .../internal/models      0.599s
ok  .../internal/services    3.038s
ok  .../internal/middleware  0.504s
ok  .../internal/handlers    7.514s
```

**Per-test evidence** (verbose, `-count=1`): `TestGenerateKey` (2 subtests), `TestHashKey` (3), `TestPrefixOf` (2), `TestAPIKeyValidate` (5) — PASS · `TestAPIKeyServiceCreate/List/Revoke/ValidateToken` — PASS · `TestRequireAPIKey` + `TestRequireAPIKeyTouchLastUsed` — PASS · `TestCreateAPIKey`, `TestListAPIKeys`, `TestRevokeAPIKey`, `TestAPIV1ConfigMatchesPublic`, `TestAPIV1ProductsMatchesPublic`, `TestAPIV1CreateOrderAndStatus`, `TestAPIV1AuthMatrix`, `TestPublicRoutesUnchanged` — PASS. 54 integration + 12 unit cases, 0 failures, 0 skips.

**Database**: PostgreSQL 16-alpine reachable at localhost:5434; `schema_migrations` head = 10, `dirty = false`; `store_api_keys` table verified live: `key_hash VARCHAR(64) NOT NULL UNIQUE`, FK → `stores(id) ON DELETE CASCADE`, `idx_store_api_keys_store_id`, `active DEFAULT TRUE`, `created_at DEFAULT NOW()`, **no `updated_at` column** (ADR-7 consistency confirmed).

**Coverage** (configured threshold: 0 — informational):
```text
go test -count=1 -p 1 ./internal/models ./internal/middleware -cover -timeout 120s → exit 0
ok  .../internal/models      coverage: 76.5% of statements (whole package)
ok  .../internal/middleware  coverage: 33.3% of statements (whole package)
```
Changed-file detail below (per-file, from coverprofiles).

### Spec Compliance Matrix

**Scenario count note**: the orchestrator brief cited 8 + 5 = 13 scenarios. The spec files as written contain **7 scenario blocks** in `api-key-management/spec.md` and **5** in `storefront-developer-api/spec.md` (12 total). This report maps the 12 scenarios that exist; the brief's 8th api-key-management scenario does not exist in the file.

#### api-key-management (7 scenarios)

| Requirement | Scenario | Covering test (all PASSED at runtime) | Result |
|-------------|----------|----------------------------------------|--------|
| Create Store API Key | Owner creates key | `handlers/api_keys_test.go > TestCreateAPIKey/creates_a_key_and_returns_the_plaintext_exactly_once` (200, `gsk_`+40 regex, raw-body count==1); `services/api_key_service_test.go > TestAPIKeyServiceCreate` (DB re-read: hash+prefix+active=true) | ✅ COMPLIANT |
| Create Store API Key | Plaintext never re-shown | `TestListAPIKeys/raw_list_body_never_contains_the_plaintext`; `TestAPIKeyServiceList/serialized_rows_expose_metadata_but_never_key_hash...` (json.Marshal contains neither plaintext nor key_hash) | ✅ COMPLIANT |
| Key Name Validation | Invalid name rejected | `TestCreateAPIKey/empty_and_101-char_names...` (400 ×3: "", "   ", 101 chars; list shows nothing persisted); `TestAPIKeyValidate` (3 rejects); `TestAPIKeyServiceCreate/rejects_a_whitespace-only_name...` (row-count delta) | ✅ COMPLIANT |
| List Keys (Masked) | List masked keys | `TestListAPIKeys/lists_masked_rows_without_key_hash_and_without_plaintext` (2 fixtures; id/name/prefix/active present, key_hash/plaintext absent) | ✅ COMPLIANT |
| Revoke Key | Revoke a key | `TestRevokeAPIKey/revoke_returns_204_and_marks_the_key_revoked` (204 + DB: active=false, revoked_at set); 401-after-revoke: `TestAPIV1AuthMatrix/valid_key_returns_200_and_is_401_after_revocation` + `TestRequireAPIKey/revoked_key` | ✅ COMPLIANT |
| Store-Scoped Isolation | Non-owner blocked | `TestCreateAPIKey/another_owner_cannot_create_keys_for_this_store` (403) + `TestRevokeAPIKey/another_store's_owner_cannot_revoke_this_key` (403 via `StoreContext`) | ✅ COMPLIANT |
| Store-Scoped Isolation | Cross-store keyId | `TestRevokeAPIKey/a_keyId_from_another_store_returns_404_and_leaves_the_key_intact` (404 + DB: foreign key still active=true) | ✅ COMPLIANT |

Requirement clause without scenario block: *"an unknown `:storeId` SHALL get 400"* — inherited pre-existing `middleware/store_context.go` behavior (non-UUID `:storeId` → 400), no dedicated test in this change. See WARNING-1.

#### storefront-developer-api (5 scenarios)

| Requirement | Scenario | Covering test (all PASSED at runtime) | Result |
|-------------|----------|----------------------------------------|--------|
| Versioned Endpoint Group | Fetch store config | `TestAPIV1ConfigMatchesPublic` (`require.Equal` deep-equal vs `/public/:slug/config`) | ✅ COMPLIANT |
| Bearer Authentication | Valid key bound to slug | `TestAPIV1ProductsMatchesPublic` (200, parity) + `TestRequireAPIKey/valid_key_bound_to_its_slug_reaches_the_handler_with_store_id` (200 + Locals store_id echo) | ✅ COMPLIANT |
| Bearer Authentication | Store mismatch | `TestAPIV1AuthMatrix/key_from_another_store` (403) + `TestRequireAPIKey/key_from_another_store` (403, handler never ran) | ✅ COMPLIANT |
| Bearer Authentication | Missing, unknown, revoked, or expired key | `TestAPIV1AuthMatrix`: missing(401)/malformed(401)/unknown(401)/expired(401)/inactive(401) + `TestRequireAPIKey` same 5 modes | ✅ COMPLIANT |
| last_used_at Tracking | Throttled update | `TestRequireAPIKeyTouchLastUsed/last_used_at_younger_than_1h_is_left_untouched` (200 + DB timestamp unchanged, MAY skip honored) + `...older_than_1h_is_refreshed` + `fresh_key...gets_it_set` | ✅ COMPLIANT |

Requirement without scenario block: **`/public/*` Unchanged** → `TestPublicRoutesUnchanged` (config serves sans auth + slug, quote works, product detail excludes cost) — all PASS. ✅ COMPLIANT

**Compliance summary**: 12/12 scenarios COMPLIANT (plus both scenario-less requirements evidenced). Route table (6 endpoints) verified mounted in `internal/router/router.go` L52–58; 5 of 6 exercised at runtime (see SUGGESTION-3 for `/products/:productId`).

### Correctness (Static Evidence)

| Requirement area | Status | Notes |
|------------------|--------|-------|
| Key generation | ✅ Implemented | `crypto/rand` 20 bytes → `"gsk_" + hex.EncodeToString` (40 hex, 160-bit) |
| Hashing | ✅ Implemented | SHA-256 hex (64 chars) via `models.HashKey`; only hash persisted; `subtle.ConstantTimeCompare` in `ValidateToken` mirroring `origin_secret.go` |
| Masked serialization | ✅ Implemented | `KeyHash` tagged `json:"-"`; list response carries id/name/prefix/active/last_used_at/expires_at/created_at/revoked_at only |
| Name validation | ✅ Implemented | trimmed non-empty, ≤100 chars → 400 via handler, nothing persisted |
| Revoke semantics | ✅ Implemented | `active=false, revoked_at=NOW() WHERE ... AND revoked_at IS NULL`; 0 rows → `ErrAPIKeyNotFound` → 404 (idempotent re-revoke 404) |
| Auth matrix | ✅ Implemented | missing/malformed → 401; unknown → 401 (no row); revoked/expired/`active=false` → 401; cross-store slug → 403 |
| Store-slug binding | ✅ Implemented | single JOIN returns `s.slug`; mismatch → `ErrAPIKeyStoreMismatch` → 403 |
| `last_used_at` | ✅ Implemented | written only when NULL or stale >1h; best-effort (write error never fails request) |
| `/public` untouched | ✅ Implemented | `pub` group + `RequireOriginSecret` unchanged (router.go L37–47) |

### Coherence (Design)

| ADR | Followed? | Notes |
|-----|-----------|-------|
| ADR-1 single JOIN query | ✅ Yes | `ValidateToken`: one `SELECT k.*, s.slug FROM store_api_keys k JOIN stores s ON s.id=k.store_id WHERE k.key_hash=$1`; no-row→ErrAPIKeyInvalid(401), slug≠param→ErrAPIKeyStoreMismatch(403) |
| ADR-2 crypto/rand 20B → 40 hex + `gsk_` | ✅ Yes | `generateKey` uses `rand.Read(make([]byte,20))`; 160-bit entropy; stdlib only; varchar(64) hash shape |
| ADR-3 service + thin middleware | ✅ Yes | `ApiKeyService.ValidateToken` typed errors; `RequireAPIKey(svc)` maps Invalid→401, Mismatch→403, other→500 |
| ADR-4 direct handler reuse | ✅ Yes | Same 6 handlers mounted on `/api/v1/:storeSlug` group; group param name `storeSlug` matches handler `c.Params("storeSlug")` reads; zero handler duplication |
| ADR-5 status matrix | ✅ Yes | E2E-verified by `TestAPIV1AuthMatrix` (7 modes) + middleware matrix (8 modes) |
| ADR-6 prefix 12 chars | ✅ Yes | `prefix = plaintext[:12]` (`gsk_`+8 hex); `VARCHAR(12)` column; plaintext never stored |
| ADR-7 last_used_at budget + no `updated_at` | ✅ Yes | `apiKeyTouchInterval = time.Hour`; touch only when NULL or >1h stale; DB confirmed **no `updated_at`** on table |
| Design deviation (apply) — Revoke `AND revoked_at IS NULL` | ✅ Accepted | Refines 0-rows→404 for re-revoke; consistent with design's "0 rows → ErrAPIKeyNotFound" and DELETE idempotency; no spec conflict |
| List ordering `created_at DESC, id DESC` | ✅ Accepted | Deterministic tiebreak; sensible default |

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | "TDD Cycle Evidence" table present in Engram apply-progress #1140 |
| All tasks have tests | ✅ | 13/13 code-bearing tasks have test files (1.3 migration, 4.1 fixtures are non-testable tasks by nature) |
| RED confirmed (tests exist) | ✅ | 5/5 RED task files exist in codebase: api_key_test.go (models, services, middleware), api_keys_test.go, public_api_v1_test.go |
| GREEN confirmed (tests pass) | ✅ | Fresh `-count=1` run: models 12/12, services 18/18, handlers admin 11/11, v1 14/14 — all PASS |
| Triangulation adequate | ✅ | Known SHA-256 vector for "abc"; row-count deltas for reject paths (companion non-empty lists); raw-body `strings.Count==1` for plaintext-once; deep-equal public-vs-v1 parity; 200-before/401-after revoke sequence |
| Safety Net for modified files | ✅ | `router.go`, `fixtures.go` covered by full suite green (8 packages); no behavior regression; gofmt side-effect on `catalog_test.go` (alignment-only, pre-existing dirty tree) |

**TDD Compliance**: 6/6 checks passed.

RED evidence quality: 3 build-fail REDs (undefined symbols — legitimate Go RED) and 2 runtime REDs (404 routes missing, /api/v1 unwired) — plausible and consistent with the GREEN gates that followed.

### Test Layer Distribution

| Layer | Test funcs | Cases | Files | Tools |
|-------|-----------|-------|-------|-------|
| Unit | 4 | 12 | 1 (`internal/models/api_key_test.go`) | go test, testify/assert, testify/require |
| Integration | 14 | 54 | 4 (`services/api_key_service_test.go` 18, `middleware/api_key_test.go` 11, `handlers/api_keys_test.go` 11, `handlers/public_api_v1_test.go` 14) | go test, testify, testutil.SetupTestApp / standalone Fiber app, `app.Test`, pgx/v5, real PostgreSQL |
| E2E | 0 | 0 | — | not available per capabilities — consistent, no out-of-capability tools used |
| **Total** | **18** | **66** | **5** | |

Tools used match cached capabilities (config.yaml `testing.layers`); middleware test uses a standalone Fiber app + `database.Connect` (project-standard for DB middleware tests per design "Testing Strategy").

### Changed File Coverage

| File | Func coverage | Rating |
|------|---------------|--------|
| `internal/models/api_key.go` | Validate 100%, GenerateKey 75%, HashKey 100%, PrefixOf 100% | ✅ Excellent (~93.8%) — 75% is the `rand.Read` error branch (practically untestable) |
| `internal/middleware/api_key.go` | RequireAPIKey 94.7% | ✅ Excellent |
| `internal/services/api_key_service.go` | Create 83.3%, List 81.8%, Revoke 83.3%, ValidateToken 88.2%, TouchLastUsed 0.0% (in-package), NewAPIKeyService 100%, scanAPIKey 100% | ⚠️ Acceptable — TouchLastUsed 0.0% is a coverage-scoping artifact: it is exercised at runtime by `TestRequireAPIKeyTouchLastUsed` (middleware binary), whose DB assertions prove the writes happen/skip; in-package uncovered lines are defensive DB-error branches |
| `internal/handlers/api_keys.go` | CreateAPIKey 88.9%, ListAPIKeys 83.3%, RevokeAPIKey 80.0% | ⚠️ Acceptable — uncovered lines are error-mapping branches (500 paths) |

**Average changed-file coverage**: ~80%+ where meaningful. No file below 80% on its behavior-relevant paths (the only sub-80 line is a service function covered from another package's test binary).

### Assertion Quality (Step 5f)

| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| — | — | — | none found | — |

**Assertion quality**: ✅ All assertions verify real behavior.

Audit notes: no tautologies, no type-only assertions, no ghost loops (every `for` over `rows`/`keys`/`list` is guarded by `require.Len` on fixed fixtures; the `for _, bad := range []string{...}` uses a static 3-element literal), no smoke-only render tests, zero mocks in scope (real DB + real router instead). Strong triangulation signals: known SHA-256 vector, DB re-reads after writes, delta counts for reject paths, deep-equal public↔v1 parity, 200→revoke→401 sequences, WithinDuration throttle checks.

### Quality Metrics

**Linter**: ➖ Not available (no .golangci.yml — `go vet` used as baseline: clean)
**Type Checker**: ✅ No errors (`go build ./...` exit 0)
**Formatter**: ✅ Clean (`gofmt -l` empty on all 11 changed Go files)

### Issues Found

**CRITICAL**: None.

**WARNING**:
1. `api-key-management` requirement clause "an unknown `:storeId` SHALL get 400" (Store-Scoped Isolation) has no dedicated covering test in this change. The behavior is inherited from the pre-existing `middleware/store_context.go` (non-UUID `:storeId` → 400), so the admin routes deliver it, but no new test asserts it. Suggest one subtest in `api_keys_test.go` (GET `/stores/not-a-uuid/api-keys` → 400) to pin the clause.

**SUGGESTION**:
1. Scenario count discrepancy: orchestrator brief cites 8 api-key-management scenarios (13 total); the spec files contain 7 (12 total). This report maps the 12 that exist.
2. apply-progress GREEN "12/12" for middleware counts "Locals echo" as a separate case; the file has 11 subtests (all pass — 8 matrix + 3 throttle; Locals echo is an assertion inside the happy-path subtest). Cosmetic reporting quirk.
3. `GET /api/v1/:storeSlug/products/:productId` has no dedicated runtime test (mounted + reused per ADR-4; verified statically). A cheap parity subtest mirroring `TestAPIV1ProductsMatchesPublic` would close the last route gap.
4. `schema_migrations` contains only the version-10 row (versions 1–9 absent) — ops hygiene curiosity from the local dev DB, no functional impact (all schema objects verified present).
5. `middleware/api_key_test.go` hardcodes DB host/port/credentials and gates on `DB_HOST` (`envOrSkip`) while other tests use `config.Load()` defaults — align for consistency.
6. `GenerateKey` 75% — the uncovered branch is the `rand.Read` error path; practically untestable by design.

### Verdict

**PASS WITH WARNINGS** — one non-blocking WARNING on a requirement clause (pre-existing inherited behavior) plus informational suggestions. All 12 spec scenarios have covering tests that RAN and PASSED on a fresh `-count=1` execution; all 15 tasks complete; build, vet, gofmt, coverage commands exit 0; Strict TDD evidence validated (RED files exist, GREEN counts re-verified, assertion quality clean); design coherent across all 7 ADRs.
