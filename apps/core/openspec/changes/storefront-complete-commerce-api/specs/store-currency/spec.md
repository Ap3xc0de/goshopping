# store-currency Specification

## Purpose

USD-only currency truth. Core exposes a single currency per store (USD) via `stores.config`; no selector, no conversion, no COP code paths. Totals (including IVA 19%) stay consistent in USD.

## Requirements

### Requirement: USD-Only Store Currency

The system SHALL read `stores.config.currency` through the existing `StoreConfig` model and TREAT `USD` as the only currency in this change, defaulting to `USD` when the config omits it. The system MUST NOT expose a COP/USD selector, MUST NOT convert prices, and MUST NOT support per-currency price lists. A config value other than `USD` SHALL NOT change served prices in this change.

#### Scenario: Missing config defaults to USD

- GIVEN store S with `config = {}`
- WHEN GET `/config`
- THEN `currency` is `"USD"`

### Requirement: Currency in Config Response

`PublicStoreConfigResponse` (GET `/config`, both route groups) SHALL gain a `currency` field (string) sourced from the rule above.

#### Scenario: Config exposes currency

- GIVEN store S whose config has `{"currency":"USD"}`
- WHEN GET `/api/v1/{S.slug}/config`
- THEN the response includes `"currency":"USD"`

### Requirement: Orders Record Currency

`orders` SHALL gain `currency` CHAR(3) NOT NULL DEFAULT `'USD'`. On creation the system MUST persist the store's currency from config. Legacy orders default to `USD` and stay readable.

#### Scenario: New order stamps currency

- GIVEN store S configured with currency USD
- WHEN POST `/orders` succeeds
- THEN the row's `currency` is `'USD'`

### Requirement: Consistent USD Totals

The existing hardcoded IVA 19% tax SHALL keep applying, now implicitly USD (it is computed on USD totals server-side). Public responses and store config SHALL offer no currency dimension other than the configured one; clients (the storefront) SHOULD drop COP copy and derive display currency from `/config`.
