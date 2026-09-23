# catalog-browsing Specification

## Purpose

Server-side catalog discovery for the public API: accent-insensitive search over `name`, `sku` and `description`; server-side sorting over a fixed whitelist; and hierarchical categories (`categories` table) with real SQL counts. Replaces the storefront's client-side sort and its 100-product count approximation. Applies to both route groups (`/public/:storeSlug` and `/api/v1/:storeSlug`).

## Requirements

### Requirement: Accent-Insensitive Search

The system MUST extend `ListProducts` search to match `products.name`, `products.sku` and `products.description`, normalized case- and accent-insensitively via the `unaccent` extension (additive extension migration). The system SHOULD back this with a `pg_trgm` GIN index over `(name, sku, description)` and MAY keep ILIKE as fallback for small catalogs.

#### Scenario: Accented term matches description

- GIVEN a product whose `description` contains "para caballos de tiro"
- WHEN GET `/products?search=caballos`
- THEN the product is returned

#### Scenario: Accent-insensitive name match

- GIVEN a product named "Bridón"
- WHEN GET `/products?search=bridon`
- THEN the product is returned

### Requirement: Server-Side Sort Whitelist

Sorting MUST happen in the database (`ORDER BY`), never client-side. The `sort` param MUST accept only: `newest` (default, `products.created_at DESC`), `price_asc`, `price_desc` (null-safe on `products.price`), `name` (`products.name ASC`). Unknown values SHALL return 400.

#### Scenario: Unknown sort rejected

- GIVEN any store
- WHEN GET `/products?sort=popularity`
- THEN 400 with an error payload naming the allowed values

#### Scenario: Price sort deterministic

- GIVEN products with prices 100, 50, 50
- WHEN GET `/products?sort=price_asc`
- THEN results are ordered 50, 50, 100 with a deterministic secondary key

### Requirement: Hierarchical Categories with Real Counts

The system MUST store categories in a new `categories` table (`id`, `store_id` FK, `name`, `slug`, `parent_id` UUID NULL self-reference, `sort_order`, `created_at`, `updated_at`), store-scoped, `slug` unique per store. `products` SHALL gain a nullable `category_id` FK while the legacy flat `products.category` string remains populated during transition. `GET /categories` MUST return the tree (parents with `children[]`) where every node carries `product_count` — the REAL number of active products assigned to that node, computed in SQL (GROUP BY), never client-side.

#### Scenario: Tree with real counts

- GIVEN category "Tack" with 2 products and child "Saddles" with 3 active + 1 inactive product
- WHEN GET `/categories`
- THEN "Tack" appears with `product_count: 2` and `children` containing "Saddles" with `product_count: 3`

#### Scenario: Products filter by subcategory

- GIVEN products assigned to category "Saddles" under "Tack"
- WHEN GET `/products?category=Saddles`
- THEN only products assigned to "Saddles" are returned

### Requirement: Admin Category Management

The system MUST expose store-scoped category CRUD for the admin panel: `GET/POST /stores/:storeId/categories`, `PUT/DELETE /stores/:storeId/categories/:categoryId` (JWT + `StoreContext`). Deleting a category that still has children MUST be rejected with 409. Requires JWT `role` owner or operator.

#### Scenario: Create nested child

- GIVEN a seller with category "Tack"
- WHEN POST `/stores/:storeId/categories` with `{"name":"Saddles","parent_id":"<Tack id>"}`
- THEN 201 and subsequent `GET /categories` nests "Saddles" under "Tack"

#### Scenario: Delete parent with children refused

- GIVEN category "Tack" has children
- WHEN DELETE `/stores/:storeId/categories/<Tack id>`
- THEN 409 and the row is untouched
