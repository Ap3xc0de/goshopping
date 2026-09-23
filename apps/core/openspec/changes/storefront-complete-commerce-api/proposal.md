# Proposal: Complete The Bit Equestrian Commerce API

## Intent

Make the storefront function end-to-end. Verified gaps (exploration.md, 2026-09-21): real orders 422 (address mismatch), shipping always free, category counts capped at 100 products, sizes/colors UI-only, newsletter backendless, currency copy contradicts prices.

## Scope

**In**: catalog sort/search/categories, product variants, shipping zones + carrier pricing, newsletter, multi-currency, admin UI (variants + hierarchical categories).

**Out**: payment gateways (record-only), newsletter providers, carrier API integration (pricing only), per-currency product price lists.

## Binding decisions

1. **Payments**: record-only — `payment_method`/`payment_status`, no gateway.
2. **Currency**: COP/USD selector; store-scoped enabled currencies.
3. **Shipping**: store-defined zones; carriers priced by weight/price formulas (products gain `weight`).
4. **Newsletter**: own table + public `POST /newsletter`; provider later.
5. **Admin UI** in this change: variant CRUD + hierarchical category manager.

## Capabilities

- New: `catalog-browsing`, `product-variants`, `shipping-zones`, `store-newsletter`, `store-currency`.
- Modified: `storefront-developer-api` — route table + response shapes change (config currency, variants, quote/orders shipping), on both `/public` and `/api/v1`.

## Approach

Four additive slices (<400-line chained PRs each):

| # | Slice | Apps |
|---|-------|------|
| 1 | Catalog: description + accent-insensitive search, sort whitelist, `categories` self-referencing tree + `GET /categories` real counts | core |
| 2 | Variants: `product_variants` (SKU, size, color, price, stock); optional `variant_id` in quote/orders, product-level fallback | core |
| 3 | Checkout: shipping cost in quote/orders, address fix, currency in `/config`, newsletter | core + storefront |
| 4 | Admin UI: variant CRUD, category manager, bulk-import compatibility | admin |

## Affected areas

- **core**: `internal/router`, `handlers/public.go` + `public_quote.go`, `services/{product,quote_resolver,order}_service.go`, `models/{product,order,store}.go`, migrations 011+, `testutil/fixtures.go`.
- **storefront**: `lib/api/{client,types}.ts`, checkout/cart/catalog pages, `site-footer.tsx`, `lib/format.ts`, `lib/seo.ts`, `lib/i18n/dictionaries.ts`.
- **admin**: `dashboard/products/*`, new category pages, `ProductForm.tsx`, bulk import.

## Risks

- Conversion source undecided (see below) — display vs DB price truth.
- Carrier formulas require `products.weight` — touches all product writes and import.
- Hierarchical categories ripple into category-scoped offers and bulk import.
- IVA 19% hardcoded in core + 3 storefront files; totals must come from backend, not client math.
- Legacy orders stay readable when `orders.items` JSONB gains variant fields. New tables store-scoped (multi-tenant).

## Rollback

Additive migrations with down scripts; slices deploy independently (storefront mock-fallback tolerates missing fields); legacy `products.category` kept during transition; category tree ships before variants.

## Success criteria

- [ ] Real order with address, shipping method, carrier-computed total succeeds end-to-end.
- [ ] COP/USD toggle reflected everywhere; orders record currency.
- [ ] Variant stock deducted correctly; product-level fallback keeps admin/bulk/offers working.
- [ ] `make test-core` green; storefront builds; admin variant/category CRUD works.

## Open questions (non-blocking)

1. Address: keep core `{street,city,state,zip}`, fix storefront client? (recommended)
2. COP conversion: fixed rate in `stores.config` vs live API?
3. `weight`: product-level (recommended v1) vs per-variant?
