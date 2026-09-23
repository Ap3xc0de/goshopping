# shipping-zones Specification

## Purpose

Store-defined shipping zones and carrier methods priced by formula. The product-level `products.weight` field feeds every formula; `shipping_total` appears in quotes and is persisted on orders. Applies to both route groups.

## Requirements

### Requirement: Zone and Carrier Storage

The system MUST store `shipping_zones` (`id`, `store_id` FK, `name`, `sort_order`, `created_at`, `updated_at`) and `shipping_methods` (`id`, `store_id` FK, `zone_id` FK → `shipping_zones`, `code`, `name`, `base_price` DECIMAL(12,2) NOT NULL DEFAULT 0, `weight_rate` DECIMAL(12,2) NOT NULL DEFAULT 0, `active` BOOLEAN DEFAULT true, `created_at`, `updated_at`). Both SHALL be store-scoped; `code` unique per store. A method belongs to exactly one zone.

#### Scenario: Zone with two carriers

- GIVEN zone "Bogotá" 
- WHEN carriers "Standard" (`base_price` 5, `weight_rate` 0.1) and "Express" (`base_price` 9, `weight_rate` 0.2) are stored
- THEN both rows exist under that zone's `zone_id`

### Requirement: Product Weight Field

`products` SHALL gain `weight` NUMERIC(8,3) NOT NULL DEFAULT 0 — product-level, NOT per-variant. It feeds carrier formulas: order weight = Σ (`products.weight` × quantity). Its unit SHALL be documented in one place for clients (design phase fixes kg vs g).

#### Scenario: Weight sums across lines

- GIVEN line A quantity 2 × weight 1 and line B quantity 1 × weight 0.5
- WHEN a quote computes shipping
- THEN formula weight is 2.5

### Requirement: Public Shipping Methods Endpoint

The system MUST expose `GET /shipping-methods` returning active zones with nested methods (`code`, `name`, `base_price`, `weight_rate`, `zone`). Inactive methods SHALL be excluded.

#### Scenario: List public methods

- GIVEN zone with 2 active methods and 1 inactive
- WHEN GET `/shipping-methods`
- THEN 200 listing the 2 active methods with their formula fields

### Requirement: Quote Returns shipping_total

`POST /quote` MAY include `shipping_method` (a method `code`). The `CartPreview` response MUST then gain `shipping_total` = `base_price + weight × weight_rate` (null-safe: 0 when unset), and `total` SHALL become `effective_subtotal − discount_total + shipping_total + tax`. Unknown/inactive/non-store `shipping_method` SHALL return 422. Omitting `shipping_method` yields `shipping_total: 0` — old clients unchanged.

#### Scenario: Quote with carrier cost

- GIVEN method "std" (`base_price` 5, `weight_rate` 0.1) and order weight 10
- WHEN POST `/quote` with `"shipping_method":"std"`
- THEN `shipping_total` is 6 and `total` includes it

#### Scenario: Bad method code

- GIVEN no method with code "dhl"
- WHEN POST `/quote` with `"shipping_method":"dhl"`
- THEN 422

### Requirement: Orders Persist Shipping

`orders` SHALL gain `shipping_method` TEXT NULL and `shipping_total` DECIMAL(12,2) NOT NULL DEFAULT 0. `POST /orders` MUST accept `shipping_method`, compute `shipping_total` server-side (never trust the client's number), and persist both. `orders.total` MUST be `subtotal − discount_total + shipping_total + tax`. Orders written before this change (NULL shipping_method, 0) MUST stay readable.

#### Scenario: Order stores carrier totals

- GIVEN a quote resolved via method "std"
- WHEN POST `/orders` with `"shipping_method":"std"`
- THEN the stored row has `shipping_method='std'`, `shipping_total` matching the formula, and `total` including it
