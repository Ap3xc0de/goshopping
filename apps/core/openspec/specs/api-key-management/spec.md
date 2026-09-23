# api-key-management Specification

## Purpose

Store-scoped developer keys for the public storefront API. Managed by store owners under JWT + `StoreContext`; keys are stored as SHA-256 hashes and the plaintext is shown exactly once.

## Requirements

### Requirement: Create Store API Key

`POST /stores/:storeId/api-keys` — an owner authenticated via JWT + `StoreContext` MUST be able to create a key. The response MUST include the plaintext key (`gsk_` + 40 random chars, high entropy) EXACTLY ONCE. Only `store_api_keys.key_hash` (SHA-256, varchar(64) UNIQUE) and `prefix` SHALL be persisted; `active` defaults to true.

#### Scenario: Owner creates key

- GIVEN an owner authenticated for `:storeId`
- WHEN they POST `{name}` to `/stores/:storeId/api-keys`
- THEN 200 with plaintext `gsk_`+40 chars shown exactly once
- AND a `store_api_keys` row persists `key_hash`, `prefix`, `active=true`, `created_at`

#### Scenario: Plaintext never re-shown

- GIVEN a key created earlier
- WHEN the owner lists or refetches it
- THEN only `prefix` + masked metadata are returned, never plaintext or `key_hash`

### Requirement: Key Name Validation

`name` MUST be non-empty after trimming and at most 100 chars. Violations SHALL return 400 and persist nothing.

#### Scenario: Invalid name rejected

- GIVEN an owner authenticated for `:storeId`
- WHEN they POST with an empty or >100-char `name`
- THEN 400 and no `store_api_keys` row

### Requirement: List Keys (Masked)

`GET /stores/:storeId/api-keys` MUST return the store's keys exposing `id`, `name`, `prefix`, `active`, `last_used_at`, `expires_at`, `created_at`, `revoked_at` — MUST NOT expose `key_hash` or plaintext.

#### Scenario: List masked keys

- GIVEN an owner authenticated and 2+ keys exist
- WHEN they GET `/stores/:storeId/api-keys`
- THEN 200 with an array of masked rows and no `key_hash` field

### Requirement: Revoke Key

`DELETE /stores/:storeId/api-keys/:keyId` MUST set `revoked_at` (and `active=false`). A revoked key SHALL immediately fail authentication on `/api/v1/*`.

#### Scenario: Revoke a key

- GIVEN key `:keyId` belonging to `:storeId`
- WHEN the owner DELETEs `/stores/:storeId/api-keys/:keyId`
- THEN 204 and `revoked_at` set
- AND that key now receives 401 on `/api/v1/*`

### Requirement: Store-Scoped Isolation and Errors

Keys SHALL be store-scoped (`store_api_keys.store_id` FK → `stores.id`). A non-owner account MUST get 403 (via `StoreContext`), an unknown `:storeId` SHALL get 400, and a `:keyId` from another store SHALL get 404. Expired keys (`expires_at` in the past) MUST be rejected.

#### Scenario: Non-owner blocked

- GIVEN account X with no `store_users` record for the store
- WHEN X calls key admin routes
- THEN 403 from `StoreContext`

#### Scenario: Cross-store keyId

- GIVEN key K belonging to store B
- WHEN the owner of store A DELETEs `/stores/{A}/api-keys/{K}`
- THEN 404 and K remains unchanged
