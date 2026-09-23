# Exploration: storefront-complete-commerce-api

Purpose: define what the Go core must provide so the The Bit Equestrian storefront
(`apps/thebitequestrian`) works at 100% — search, filters, sorting, categories,
variants, shipping, newsletter, coupons, currency, payments. Verified against real
code in `apps/core` and `apps/thebitequestrian` (2026-09-21).

## Current State

### Core API surface (verified)

Both route groups mount the SAME public handlers — `/public/:storeSlug/*` (origin-secret)
and `/api/v1/:storeSlug/*` (Bearer `gsk_` API key via `RequireAPIKey`):

| Method | Path | Handler |
|--------|------|---------|
| GET | `/config` | `PublicStoreConfig` |
| GET | `/products` | `PublicListProducts` |
| GET | `/products/:productId` | `PublicGetProduct` |
| POST | `/quote` | `QuoteCart` |
| POST | `/orders` | `PublicCreateOrder` |
| GET | `/orders/:orderId/status?token=` | `PublicOrderStatus` |

### Verified details

**Catalog (`product_service.go` ListProducts via `handlers/public.go`)**
- `page`/`per_page` (default 24, clamped [1,100]); `category` = EXACT match
  (`category = $N`); `search` = `name ILIKE OR sku ILIKE` ONLY — no description,
  no accent-insensitivity; status forced to `"active"`; `ORDER BY created_at DESC`
  fixed. No `sort`, no price filter, no subcategory.
- `products` table (migration 001): flat `category VARCHAR(100)`, single `stock`
  INTEGER, no variants/sizes/colors. Index `idx_products_store_category` exists.
- `getCategories()` in the storefront derives counts client-side from the FIRST
  100 products (`getProducts({per_page:100})`) — wrong counts above 100 SKUs.

**Quote (`public_quote.go` → `quote_resolver.go` ComputeQuote)**
- Items = `{product_id, quantity}` only. Stock checked at PRODUCT level.
- Coupon IS validated: `ComputeQuote` rejects expired (`ErrCouponExpired`) and
  limit-exceeded (`ErrCouponLimitExceeded`) coupons. Cart-scope coupons only;
  line coupons out of scope. NO min-subtotal threshold exists in the model.
  (Correction to brief: "no coupon validation" is inaccurate — active/limit
  validation exists.)
- Tax = hardcoded `IVARate` 19% (Colombian IVA, `order_service.go` var).
- NO shipping method, NO shipping cost anywhere in quote/orders.

**Orders (`order_service.go` CreateOrder)**
- `CreateOrderInput`: customer fields, `items[]{product_id,quantity}`,
  `payment_method`, `coupon_code`, `shipping_address{street,city,state,zip,country,notes}`,
  `notes`. NO `shipping_method`/`shipping_total`.
- `orders` table has `subtotal, discount_total, tax, total, payment_status`
  (009) — no shipping columns. Items JSONB shape: `OrderItem{product_id,name,
  quantity,unit_price,total}`.
- Stock deducted at product level in a tx (`SELECT ... FOR UPDATE`).

**Config / currency**
- `stores.config` JSONB; Go `models.StoreConfig{Currency,Locale,Timezone}` is
  DECLARED BUT UNUSED (dead code — no reader anywhere). `PublicStoreConfigResponse`
  exposes id/name/slug/status/branding/template_id — no currency.
- `Money` serializes as a JSON number from `DECIMAL(12,2)`, no currency dimension.

**Newsletter / payments**
- Newsletter: NOTHING in core (no table, no endpoint). Storefront footer has a
  dead input+button (no handler).
- Payments: `payment_method` free string + `payment_status` lifecycle only. No
  gateway. Storefront checkout payment card fields are DISABLED placeholders and
  `payment_method` is never sent by the storefront.

### Storefront needs (verified against `apps/thebitequestrian`)

- **catalog page**: flat category sidebar from `getCategories()` counts; search
  via `?search=`; `catalog-sort.tsx` sorts CLIENT-SIDE only the current page
  (acknowledged bug in its own comment); server-side pagination.
- **product page**: `size-selector.tsx` renders sizes from `dict.sizes`
  `['XS','S','M','L','XL']` — UI-only; the chosen size lives only in localStorage
  cart (`variant: size`). No colors (image thumbnails only). SKU shown as-is.
- **cart**: pure client-side (`lib/cart.ts`), computes subtotal/tax (TAX_RATE 0.19)
  and totals locally — the backend quote is NOT consumed by the cart screen.
- **checkout**: `standard/express/show-ground` radio options, ALL hardcoded price 0
  ("free"), client-side tax+total; posts through `/api/checkout` route →
  core `POST /orders`. Sends `shipping_address{line1,line2,city,postal_code,country}`
  — **shape MISMATCH with core** `{street,city,state,zip,country}` whose
  `Validate()` 422s when street/state/zip missing → real orders with an address
  fail today. `shipping_method` is sent but silently dropped by core.
- **order confirmation**: consumes `/orders/:id/status?token=` but only reads
  `status`; timeline steps hardcoded; totals/items not rendered.
- **currency inconsistency in copy**: `formatPrice` defaults `USD`; `lib/seo.ts`
  hardcodes `priceCurrency: 'USD'`; dictionaries say "Free national shipping on
  orders over $250,000 COP" — USD prices + COP copy mixed.
- **coupons**: zero UI in the storefront today (quote supports them, UI doesn't).

## Affected Areas

**Core (this change)**
- `internal/router/router.go` — new v1 routes (categories, newsletter, shipping).
- `internal/handlers/public.go` — search/sort/filter params, variants in product
  shapes, currency in config response.
- `internal/handlers/public_quote.go` — variant-aware items, shipping method.
- `internal/services/product_service.go` — `ListProducts` (sort, search incl.
  description, price filter), categories query.
- `internal/services/quote_resolver.go` — shipping cost in `CartPreview`, variant
  pricing.
- `internal/services/order_service.go` — persist `shipping_method`/`shipping_total`,
  variant-level stock lock/deduct, totals incl. shipping.
- `internal/models/product.go`, `order.go`, `store.go` — variants, shipping, currency.
- `migrations/` — 012 (variants, orders.shipping_*, newsletter_subscribers, indexes).
- `internal/testutil/fixtures.go` — variant/shipping/newsletter fixtures.
- Also impacted (compat): admin `handlers/product.go` + bulk import + offer
  resolver (category-scoped offers) must keep working with optional variants.

**Storefront (follow-up slices, coordinated)**
- `lib/api/client.ts`, `lib/api/types.ts` — new params/fields.
- `components/catalog-sort.tsx`, catalog/product/cart/checkout pages,
  `components/site-footer.tsx` (newsletter), `lib/i18n/dictionaries.ts` (currency
  copy), `lib/format.ts` + `lib/seo.ts` (currency from config).

## Approaches

### A — One big public API expansion (single change, all features)

One migration set + one PR chain covering search/sort/categories/variants/
shipping/newsletter/currency.

- Pros: single coherent diff; one API design pass; no intermediate compatibility.
- Cons: est. 1200–2000+ lines — blows the 400-line review budget (Section E),
  long-lived branch, one failure blocks everything, high merge risk.
- Effort: **High**.

### B — Phased, additive slices (recommended)

Three deliverable slices within sequential SDD changes (or chained PRs):
1. **Catalog slice** — server-side sort, description+accent-insensitive search,
   categories endpoint with real counts, subcategory support.
2. **Variants slice** — `product_variants`, variant stock/SKU, variants in
   product detail + quote + orders.
3. **Checkout slice** — shipping methods + cost in quote/orders, fix address
   shape contract, coupon handling, currency in `/config`, `POST /newsletter`.

- Pros: each slice independently testable/deployable/rollbackable; additive-only
  API (no breaks); respects review budget via chained PRs; catalog value ships
  first.
- Cons: more migration files; forward-compatible schema discipline required;
  storefront must tolerate missing fields across slices.
- Effort: Medium per slice, High total (safer delivery).

### C — Minimal patch (keep flat model)

Add only: `sort` param, description in search, categories counts endpoint,
`orders.shipping_method` string column, newsletter table. NO variants, NO
shipping cost.

- Pros: smallest risk, quickest.
- Cons: does NOT reach "100%" — sizes/colors stay UI-only fiction, per-variant
  stock impossible, the storefront keeps lying about sizes it can't sell;
  shipping stays "free" with no backend truth. Fails the stated purpose.
- Effort: **Low**.

## Recommendation

**B (phased, additive)**, keeping `storefront-complete-commerce-api` as the
umbrella change name with tasks grouped hierarchically (Section E: forecast and
chain PRs per slice — `Decision needed before apply` yes, chained PRs recommended
for slice boundaries).

Key design directions (for the design phase):
- **Sort**: whitelist `created_at|price_asc|price_desc|name` server-side;
  null-safe.
- **Search**: extend to `description`; accent-insensitivity via `unaccent`
  extension or trigram (`pg_trgm`) index; keep ILIKE fallback for small catalogs.
  Extensions are additive migrations.
- **Categories**: minimal path = keep flat string, add optional
  `products.subcategory TEXT` + `GET /categories` returning parents with
  sub-cat children and REAL counts (SQL GROUP BY rather than the storefront's
  100-product client-side count). Full category table deferred (admin UI cost
  not justified yet).
- **Variants**: `product_variants(id, product_id FK, sku, size, color,
  price_override, stock, status)`; public product response gains `variants[]`;
  quote/orders accept `variant_id` (fall back to product-level when product has
  no variants → backwards compatible). Stock lock/deduct at variant level.
- **Shipping**: `shipping_methods` table (store-scoped: code, name, price,
  notes) + expose via `/config` or new `GET /shipping-methods`; quote accepts
  `shipping_method` and returns `shipping_total`; orders persist both columns.
- **Newsletter**: `newsletter_subscribers(store_id, email UNIQUE, status,
  created_at)`; `POST /newsletter` validates email + dedupes + rate-limits.
- **Currency**: expose `currency` (default `USD`) from `stores.config` in
  `PublicStoreConfigResponse`; storefront consumes it for `formatPrice`/JSON-LD
  and copy.
- **Address contract**: adopt ONE shape across core and storefront (core's
  `street/city/state/zip` or the storefront's `line1/...`)—must be settled in
  the proposal; either way today's mismatch breaks real orders and is a bug fix
  inside the checkout slice.

## Risks

- Variants touch admin product endpoints + bulk CSV import + offer resolver (category-scoped) — compatibility must be preserved (variants optional everywhere).
- `ILIKE '%q%'` can't use the existing btree indexes; trigram/unaccent need extension migrations (additive, reversible).
- Hardcoded 19% IVA duplicated in BOTH apps (`IVARate` in Go, `TAX_RATE` in checkout/cart TSx) — moving tax to store config requires coordinated storefront change (currently storefront computes its own totals instead of using the quote).
- `orders.items` JSONB shape gains variant fields — public status endpoint must stay readable for old orders.
- Multi-tenant isolation: `shipping_methods`, `newsletter_subscribers`, `product_variants` must be store-scoped like everything else.

## Ready for Proposal

**Yes** — with these open questions for the proposal phase:
1. **Payments**: record-only `payment_method` (today) vs. real gateway (e.g.
   Wompi/PayU/Stripe)? The checkout disables card inputs today; gateway work is
   its own change and integration.
2. **Currency**: USD or COP as The Bit Equestrian's primary? (copy + prices
   currently conflict).
3. **Shipping pricing**: flat per-method price table (recommended) vs.
   weight/carrier zones?
4. **Newsletter**: DB collection only (recommended for this change) vs. email
   provider integration (SQS/event)?
5. **Admin UI for variants/categories**: inside this core change or deferred to
   a follow-up admin change (bulk import must at least not break)?
