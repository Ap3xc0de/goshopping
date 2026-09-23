# Design: Complete The Bit Equestrian Commerce API

## Technical Approach

Four additive slices (chained PRs, <400 lines each), single schema migration **011**, additive-only API evolution. Pure `ComputeQuote` stays DB-free; shipping and variant resolution are pre-stages that feed it. Grounded in real code: `quote_resolver.go`, `order_service.go` (Stage 4–9 tx), `public.go` slug resolution, migrations 001–010 (golang-migrate, iofs, up/down pairs).

## Architecture Decisions

| # | Decision | Option | Tradeoff | Choice |
|---|----------|--------|----------|--------|
| 1 | Weight unit | g (integers) | Ugly UX (breeches = 350 g); rate math awkward vs carrier kg pricing | **kg**, `NUMERIC(8,3)` (1 g precision, max 99999.999 kg). Documented once: migration 011 comment + `models.Product.Weight` doc + admin label "Weight (kg)". Formula: `weight_total_kg = Σ(weight_kg × qty)`; `shipping_total = base_price + weight_total_kg × weight_rate` |
| 2 | Zone↔address | (a) map address→zone at quote; (b) buyer picks method code; zones are display/admin grouping | (a) needs geocoding dep + address not captured at quote time; (b) one query, zero deps | **(b) v1**: quote takes `shipping_method` = method `code`; 422 unknown/inactive/non-store. `GET /shipping-methods` returns zones{name, sort_order}→methods[]. `orders.shipping_address.country` already persisted → future v2 adds zone→address matching additively |
| 3 | Migration 011 layout | (a) one 011 pair; (b) numbered sequence 011/012/013 | (b) steals version numbers future changes expect; slices stay code-deploy independent either way (DDL is additive+defaulted, old code ignores new columns) | **(a) one pair** `011_storefront_commerce.{up,down}.sql`, dependency-ordered; down = reverse drops. Slice rollback = code deploy revert, never partial migrate |
| 4 | Newsletter rate limit | (a) in-memory map; (b) DB table | (b) writes per request, needs GC; real guard is UNIQUE(store_id,email)→409 | **(a)** fixed-window map, key `store_id|ip`, 5/min, 429 overflow. Documented best-effort (per-instance under ECS); duplicate protection is the DB constraint |
| 5 | Multi-tenancy | — | — | **Every new table gets `store_id` FK ON DELETE CASCADE** (incl. `product_variants` — deviates from delta spec which scopes only via product; binding constraint wins, update spec at archive). Public routes resolve only via slug (`resolveStoreBySlug`), never client store_id |

Extra settlements:

- **`?category=` param** accepts a `categories.slug` now; falls back to exact-match on legacy flat `products.category` string when the slug is unknown (transition compatibility, keeps offer resolver's category-scope rows working).
- **Search**: query `unaccent(name \|\| ' ' \|\| sku \|\| ' ' \|\| description) ILIKE unaccent('%'||$1||'%')` with user input escaped (`%`, `_`, `\`); one trigram GIN index (below). ILIKE stays as non-indexed fallback.
- **Gap found in design**: delta spec defines zone/method storage but **no admin CRUD** — without it shipping is always $0 (feature dead). Add minimal `GET/POST /stores/:storeId/shipping-zones` + `POST/PUT/DELETE .../methods` (JWT+StoreContext) in slice 3. Admin UI for shipping deferred to a follow-up change (out of scope here).
- Quote totals: `total = effective_subtotal + shipping_total + tax` (tax stays on subtotal, not shipping).

## Schema Plan (migration 011 — single pair)

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE products ADD COLUMN weight NUMERIC(8,3) NOT NULL DEFAULT 0; -- kg
ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);
ALTER TABLE orders ADD COLUMN shipping_method TEXT NULL;
ALTER TABLE orders ADD COLUMN shipping_total DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'USD';
```
*(`categories` created first; FK via ALTER to keep dependency order.*)

- `categories(id UUID PK, store_id FK, name, slug, parent_id NULL self-ref, sort_order, timestamps)` — `UNIQUE(store_id, slug)`; delete parent with children → 409 (service check).
- `product_variants(id, store_id FK, product_id FK CASCADE, sku, size, color, price_override DECIMAL(12,2) NULL, stock INT ≥0, status, timestamps)` — `UNIQUE(product_id, sku)`.
- `shipping_zones(id, store_id FK, name, sort_order, timestamps)`.
- `shipping_methods(id, store_id FK, zone_id FK, code, name, base_price DECIMAL(12,2) DEFAULT 0, weight_rate DECIMAL(12,2) DEFAULT 0, active BOOL DEFAULT true, timestamps)` — `UNIQUE(store_id, code)`.
- `newsletter_subscribers(id, store_id FK CASCADE, email VARCHAR(255), status CHECK, created_at)` — `UNIQUE(store_id, email)`.
- Indexes: `idx_products_search_trgm` GIN `(unaccent(name||' '||coalesce(sku,'')||' '||coalesce(description,'')) gin_trgm_ops)`; `idx_products_store_category_id`; `idx_variants_product`; `idx_methods_zone`; `idx_categories_store_parent`.
- **Down**: drop indexes/tables, drop columns, drop extensions (IF EXISTS). Reversible test (`migrations_reversible_test.go`) extends to step 11.

## Sequence Diagrams

**Quote with shipping** (both route groups):

```
Storefront → POST /quote {items[], shipping_method?}
  resolveStoreBySlug        → store_id (404)
  GetProduct ×items         → price / variant price_override, weight  (422 bad variant_id)
  ListActiveOffers + coupon → ComputeQuote: subtotal, discount, tax (422 expired/limit)
  GET shipping method by (store_id, code)  → base_price, weight_rate  (422 unknown/inactive)
  shipping_total = base_price + Σ(weight×qty) × weight_rate
  → {items, subtotal_before_discount, effective_subtotal, discount_total,
     applied_coupon?, tax, shipping_total, total}
```

**Order with variants** (server-computed totals):

```
Checkout form → /api/checkout → POST /orders {shipping_address{street,city,state,zip}, items[{product_id,variant_id?}], shipping_method?}
  Validate() address          → 422 naming missing field (shape UNCHANGED)
  resolve variants            → price_override ?? product.price; stock at variant
  ComputeQuote + shipping     → totals (never trust client numbers)
  BEGIN
    SELECT variant/product FOR UPDATE → stock check (ErrInsufficientStock)
    INSERT orders (items JSONB + variant_id/sku/size/color snapshots,
                   shipping_method, shipping_total, currency='USD')
    UPDATE variant stock −= qty (out_of_stock status flip)
    coupon_usage / timeline rows
  COMMIT → 201 {order, access_token} → confirmation page reads status+items
```

## Endpoint Contracts (additive)

| Endpoint | Request | Response / Notes |
|---|---|---|
| `GET /products` | +`sort` (whitelist, 400 else), `search` (+desc, accent-insensitive), `category` (slug) | +`variants[]`, `weight` per product (batch-load variants, one query — no N+1) |
| `GET /products/:id` | — | +`variants[]`, `weight` |
| `GET /categories` | — | tree: `[{id,name,slug,product_count,children[]}]`, SQL GROUP BY per node (direct assignments only) |
| `GET /shipping-methods` | — | `[{zone:{name},code,name,base_price,weight_rate}]`, active only |
| `POST /quote` | +`shipping_method`, items +`variant_id` | +`shipping_total`; total formula above |
| `POST /orders` | +`shipping_method`; items +`variant_id` | persists `shipping_method`, `shipping_total`, `currency`; 422 address contract kept |
| `POST /newsletter` | `{email}` | 201 / 409 dup / 400 invalid / 429 rate-limited |
| `GET /config` | — | +`currency:"USD"` |
| Admin: categories CRUD | `GET/POST /stores/:id/categories`, `PUT/DELETE .../:categoryId` | 409 parent-with-children |
| Admin: variants CRUD | `POST /stores/:id/products/:pid/variants`, `PUT/DELETE .../variants/:vid` | bulk import + offer resolver untouched |
| Admin: zones/methods | `GET/POST .../shipping-zones`, `POST/PUT/DELETE .../methods` | minimal, no UI this change |

## Error Mapping

| Status | Case |
|---|---|
| 400 | unknown `sort`, invalid email, malformed body |
| 404 | store/product not found |
| 409 | duplicate subscriber; delete category with children |
| 422 | unknown/mismatched `variant_id`, unknown/inactive `shipping_method`, incomplete address |
| 429 | newsletter rate limit exceeded |

## Admin UI (slice 4 — apps/admin)

- **Variants editor**: `components/products/VariantsEditor.tsx` in `dashboard/products/[id]` — inline table (sku/size/color/price_override/stock/status) over new endpoints.
- **Category manager**: new `dashboard/categories/page.tsx` — tree, create-child, rename, delete (409 → toast), `sort_order` reorder. Reuses Sidebar/Toast patterns.
- **Currency note**: read-only "Currency: USD" line in `dashboard/settings` (no selector — USD-only binding).
- **Bulk import**: optional `weight` CSV column, backward compatible.

## Storefront Integration (slice 3 — apps/thebitequestrian)

- `lib/api/types.ts` + `client.ts`: new types (categories, shipping-methods, variants, `currency`, `shipping_total`); `getCategories` switches from 100-product client count → `GET /categories`.
- `checkout-client.tsx`: address payload → `{street (street+apartment), city, state (NEW required field), zip, country}`; shipping radios replaced by `GET /shipping-methods`; totals from real `quote` (drop `TAX_RATE` client math); `payment_method` stays unsent (record-only, nullable).
- `site-footer.tsx`: newsletter form → new `app/api/newsletter/route.ts` (like `/api/checkout`).
- `lib/format.ts`, `lib/seo.ts`, `dictionaries.ts`: currency from `/config` (fallback USD); drop COP copy.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | sort whitelist/query builder, weight & shipping formula, StoreConfig currency default, rate limiter window | pure Go, testify (`services` package) |
| Integration | handlers per slice: search accent matches, category tree counts (CleanDB + fixtures), variant quote/order incl. stock dedup at variant level, 422/409/429 paths, admin CRUD | `testutil.SetupTestApp`, pgx localhost:5434, new fixtures: `CreateTestVariant`, `CreateTestCategory`, `CreateTestShippingZone/Method`, `CreateTestSubscriber` |
| Migration | 011 up/down reversible | extend `migrations_reversible_test.go` to step 11 |

## Migration / Rollout

Phased slices deploy independently: storefront client tolerates missing fields (existing mock fallback); migration 011 ships with slice 1; unused tables/columns are inert until their slice's code lands. **Rollback**: `migrate down 1` drops all 011 objects; per-slice rollback = revert that PR's deploy only. Legacy `products.category` string + product-level stock keep admin/offers/bulk working through the transition.

## Open Questions

- [ ] Confirm adding minimal zone/method admin CRUD endpoints (beyond delta spec) — required so shipping is configurable; spec gains this requirement at archive time.
- [ ] Storefront needs a "State/Province" field (today only city/postal) — UX confirmation for `zip`/`state` required-by-core contract.
