# storefront-developer-api Specification

## Purpose

Versioned public API `/api/v1/:storeSlug/*` for third-party storefront apps, authenticated via `Authorization: Bearer <key>` against `store_api_keys`. Reuses the existing `/public` handlers unchanged.

## Requirements

### Requirement: Versioned Endpoint Group

The system MUST expose the following routes under `/api/v1/:storeSlug`:

| Method | Path | Existing handler reused |
|--------|------|-------------------------|
| GET | `/config` | `PublicStoreConfig` |
| GET | `/products` | `PublicListProducts` |
| GET | `/products/:productId` | `PublicGetProduct` |
| POST | `/quote` | `QuoteCart` |
| POST | `/orders` | `PublicCreateOrder` |
| GET | `/orders/:orderId/status` | `PublicOrderStatus` |

Response shapes SHALL match those handlers exactly; only authentication differs (Bearer key vs `X-Origin-Shared-Secret`).

#### Scenario: Fetch store config

- GIVEN a valid active key for `:storeSlug`
- WHEN GET `/api/v1/:storeSlug/config`
- THEN 200 with the same JSON as `PublicStoreConfig`

### Requirement: Bearer Authentication and Authorization

`RequireAPIKey` SHALL hash the presented token (SHA-256) and compare constant-time against `store_api_keys.key_hash`. Failure modes MUST be:

| Condition | Status |
|-----------|--------|
| Missing/malformed header or unknown key | 401 |
| `active=false` (including `revoked_at` set) | 401 |
| `expires_at` in the past | 401 |
| Key's `store_id` ≠ store resolved from `:storeSlug` | 403 |

A key from store A MUST NEVER authorize store B.

#### Scenario: Valid key bound to slug

- GIVEN key K created for store S
- WHEN GET `/api/v1/{S.slug}/products` with K
- THEN 200

#### Scenario: Store mismatch

- GIVEN key K created for store A
- WHEN GET `/api/v1/{B.slug}/products` with K, where A ≠ B
- THEN 403 and no handler runs

#### Scenario: Missing, unknown, revoked, or expired key

- GIVEN no header, an unknown key, `revoked_at` set, or `expires_at` in the past
- WHEN any `/api/v1/*` request is made
- THEN 401

### Requirement: last_used_at Tracking

On successful authenticated requests the system SHOULD update `store_api_keys.last_used_at`; it MAY be throttled (e.g. only when stale > 1h) to avoid a write per request.

#### Scenario: Throttled update

- GIVEN `last_used_at` was set 10 minutes ago
- WHEN another authenticated request succeeds
- THEN 200 and the `last_used_at` update MAY be skipped

### Requirement: `/public/*` Unchanged

Origin-secret-gated `/public/:storeSlug/*` routes MUST behave exactly as today; this change SHALL NOT alter their middleware or responses.
