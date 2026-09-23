# Delta for storefront-developer-api

## MODIFIED Requirements

### Requirement: Versioned Endpoint Group

The system MUST expose the following routes under `/api/v1/:storeSlug`:

| Method | Path | Handler |
|--------|------|---------|
| GET | `/config` | `PublicStoreConfig` |
| GET | `/products` | `PublicListProducts` |
| GET | `/products/:productId` | `PublicGetProduct` |
| GET | `/categories` | NEW `PublicListCategories` |
| GET | `/shipping-methods` | NEW `PublicListShippingMethods` |
| POST | `/newsletter` | NEW `PublicSubscribeNewsletter` |
| POST | `/quote` | `QuoteCart` |
| POST | `/orders` | `PublicCreateOrder` |
| GET | `/orders/:orderId/status` | `PublicOrderStatus` |

Response shapes SHALL match the shared handlers exactly; only authentication differs (Bearer key vs `X-Origin-Shared-Secret`). This change evolves several handler responses additively per its sibling specs: `/config` gains `currency`; `/products*` gains `variants`/`weight`; `/quote` gains `shipping_total` and variant items; `/orders` persists `shipping_method`/`shipping_total`/`currency`.

(Previously: route table had only `/config`, `/products`, `/products/:productId`, `/quote`, `/orders`, `/orders/:orderId/status`; responses matched today's handler shapes with no additive fields.)

#### Scenario: Fetch store config

- GIVEN a valid active key for `:storeSlug`
- WHEN GET `/api/v1/:storeSlug/config`
- THEN 200 with the same JSON as `PublicStoreConfig`
- AND the JSON includes `currency`

#### Scenario: Fetch categories with key

- GIVEN a valid active key for `:storeSlug`
- WHEN GET `/api/v1/:storeSlug/categories`
- THEN 200 with the category tree (per catalog-browsing)

### Requirement: `/public/*` Group Parity

Origin-secret-gated `/public/:storeSlug/*` routes MUST expose the same endpoints as the v1 group, including the new `/categories`, `/shipping-methods` and `/newsletter` routes. The `RequireOriginSecret` middleware SHALL NOT change; response evolutions are additive-only — a request that worked before this change MUST produce a superset-compatible response.

(Previously: `/public/*` routes were required to behave exactly as today, with no new routes added — from the api-key-management change. This change extends the group additively.)

## ADDED Requirements

### Requirement: Order Address Contract Unchanged

`POST /orders` SHALL KEEP the core address shape `shipping_address {street, city, state, zip, country?, notes?}`. A provided address missing any of street/city/state/zip MUST return 422 (existing `Validate()`). Core SHALL NOT change this shape in this change. Clients (the storefront) receiving 422 SHALL adapt their payload to this contract rather than require a core change.

#### Scenario: Complete address succeeds

- GIVEN an order payload with `shipping_address {street, city, state, zip}`
- WHEN POST `/orders` is sent
- THEN the order is created (201)

#### Scenario: Incomplete address rejected

- GIVEN a payload whose `shipping_address` lacks `zip`
- WHEN POST `/orders` is sent
- THEN 422 naming the missing field, no order created
