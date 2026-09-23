# product-variants Specification

## Purpose

Per-product variants (size/color) with their own SKU, price, and stock. Strictly backwards compatible: variants are optional everywhere — product-level fallback keeps admin endpoints, bulk import and the offer resolver working unchanged.

## Requirements

### Requirement: Variant Storage

The system MUST store variants in `product_variants` (`id`, `product_id` FK → `products` ON DELETE CASCADE, `sku`, `size`, `color`, `price_override` DECIMAL(12,2) NULL, `stock` INTEGER NOT NULL DEFAULT 0 CHECK ≥ 0, `status` `active|inactive|out_of_stock|deleted` DEFAULT `active`, `created_at`, `updated_at`), store-scoped through the product. `sku` SHALL be unique per product.

#### Scenario: Variant with own stock and SKU

- GIVEN product "Breeches" 
- WHEN its variants "S/Beige" (stock 4) and "M/Beige" (stock 0) are stored
- THEN both rows exist in `product_variants` with `stock` 4 and 0

### Requirement: Public Product Response Gains Variants

`GET /products/:productId` and `GET /products` responses MUST include each product's `variants[]` (`id`, `sku`, `size`, `color`, `price` = `price_override` when set else `products.price`, `stock`, `status`) plus the product-level `weight`. Products without variants SHALL omit `variants` (or return `[]`) so legacy clients keep working.

#### Scenario: Variant price override

- GIVEN product priced 100 with variant XL `price_override: 120`
- WHEN GET `/products/{id}`
- THEN the XL variant serializes `price: 120` while the product-level price stays 100

### Requirement: Variant-Aware Quote

`POST /quote` items MAY include `variant_id`. When present and valid for that product, price and stock checks SHALL use the variant (`price_override` fallback to product price). Unknown or mismatched `variant_id` SHALL return 422. Items without `variant_id` keep product-level behavior — quotes from old clients MUST NOT change shape except additive fields.

#### Scenario: Quote variant-friendly

- GIVEN variant A of product P with `price_override: 80` and stock 2
- WHEN POST `/quote` with `{"items":[{"product_id":P,"variant_id":A,"quantity":1}]}`
- THEN the quote's `items` responds with the variant's unit price

### Requirement: Variant Order Lines, Old Orders Readable

When an order line references a variant, `orders.items` JSONB gains `variant_id`, `sku`, `size`, `color` snapshot fields. Orders stored WITHOUT those fields MUST remain readable by `GET /orders/:orderId/status` and admin order views unchanged. Stock deduction SHALL happen at variant level (row lock, same tx pattern as product-level) when `variant_id` is present, else at product level.

#### Scenario: Old order still status-readable

- GIVEN an order created before this change with plain JSONB items
- WHEN GET `/orders/{id}/status?token=...`
- THEN 200 with the same status payload as before this change

### Requirement: Admin Variant CRUD

The system MUST expose `POST /stores/:storeId/products/:productId/variants`, `PUT .../variants/:variantId` and `DELETE .../variants/:variantId` (JWT + `StoreContext`) so the admin panel can manage sizes/colors, SKU, price and stock. Bulk import (`POST /stores/:storeId/products/bulk-import`) and the offer resolver SHALL accept products with or without variants with no breaking changes.

#### Scenario: Seller edits variant stock

- GIVEN variant V with stock 3
- WHEN PUT `/stores/:storeId/products/{pId}/variants/{V}` with `{"stock":7}`
- THEN 200 and `product_variants.stock` is 7
