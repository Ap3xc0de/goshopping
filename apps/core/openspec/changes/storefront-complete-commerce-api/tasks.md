# Tasks: Complete The Bit Equestrian Commerce API

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated lines / budget risk | ~1,450 total, <400 per slice; High unsliced, Low–Medium per slice |
| Suggested split | PR 1 catalog → PR 2 variants → PR 3 checkout → PR 4 admin |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

TDD: RED→GREEN, gate `make test-core`.

| PR | Slice | Base |
|----|-------|------|
| 1 | Catalog + migration 011 | main |
| 2 | Variants | after PR 1 |
| 3 | Checkout/shipping/newsletter/currency | after PR 2 |
| 4 | Admin UI | after PR 3 |

## Slice 1 — Catalog + Migration 011 (core)

- [x] 1.1 RED: new `internal/services/product_service_test.go` — sort whitelist (`newest|price_asc|price_desc|name`, unknown→error), escaped unaccent search. GREEN: `product_service.go` `ListProducts` +`sort`.
- [x] 1.2 RED: `public_test.go` — `?sort=popularity`→400; accented description search; slug `?category=` legacy fallback. GREEN: `public.go` `PublicListProducts`.
- [x] 1.3 `migrations/011_storefront_commerce.{up,down}.sql` per design. Extend `migrations_reversible_test.go`: `TestMigrations011DownIsReversible` (Migrate(10)→gone; cleanup Up).
- [x] 1.4 Fixture `CreateTestCategory` (WithParent/WithSortOrder) in `internal/testutil/fixtures.go`; add new tables to `CleanDB` (`setup.go`).
- [x] 1.5 RED: category tree + SQL `product_count` (active only) in `public_test.go`. GREEN: new `internal/services/category_service.go`, `PublicListCategories`, routes both groups (`router.go`).
- [x] 1.6 RED: new `internal/handlers/category_test.go` — CRUD; 409 parent-with-children. GREEN: new `internal/handlers/category.go` + admin routes.

## Slice 2 — Variants (core)

- [x] 2.1 `CreateTestVariant` fixture (sku/color/price/stock opts). RED: `public_test.go` `GET /products/:id` → `variants[]` override price.
- [x] 2.2 GREEN: `models.ProductVariant`; variant batch loader; `PublicProduct.Variants` (`public.go`).
- [x] 2.3 RED: `public_quote_test.go` variant-priced item; 422 bad `variant_id`. GREEN: `public_quote.go` pre-stage.
- [x] 2.4 RED: `order_service_test.go` — variant stock deduct + JSONB snapshots (`variant_id/sku/size/color`); old rows readable. GREEN: Stages 1/5/6/9, `OrderItemInput.VariantID`.
- [x] 2.5 RED: `product_test.go`. GREEN: admin variant CRUD + routes.

## Slice 3 — Checkout/Shipping/Newsletter/Currency (core + storefront)

- [ ] 3.1 Fixtures `CreateTestShippingZone/Method/Subscriber`.
- [ ] 3.2 RED: `public_test.go` `GET /shipping-methods` active-only. GREEN: `internal/models/shipping.go` + `services/shipping_service.go`, handler, routes.
- [ ] 3.3 RED: `quote_resolver_test.go` `ComputeQuote` +`shipping_total`; total = subtotal − discounts + shipping + tax. GREEN: `CartPreview.ShippingTotal`.
- [ ] 3.4 RED: `public_quote_test.go` 422 bad method; `base+Σ(weight×qty)×rate`. GREEN: `models.Product.Weight`+DAL, quote pre-stage.
- [ ] 3.5 RED: `order_service_test.go` persists `shipping_method/shipping_total`. GREEN: INSERT + `models.Order` fields.
- [ ] 3.6 RED: `/config` `currency:"USD"` + default unit test. GREEN: `buildPublicStoreConfig` reads `stores.config`; orders INSERT `currency='USD'`.
- [ ] 3.7 RED: `public_test.go` newsletter 201/400/409/429 + limiter unit. GREEN: `services/newsletter_service.go` (5/min `store_id|ip`), `PublicSubscribeNewsletter`, routes.
- [ ] 3.8 RED: new `internal/handlers/shipping_test.go` admin CRUD. GREEN: new `internal/handlers/shipping.go` + routes.
- [ ] 3.9 Storefront `lib/api/{types,client}.ts`: tree/shipping/variant/currency types; `getCategories`→`GET /categories`.
- [ ] 3.10 `checkout-client.tsx` + `app/api/checkout/route.ts`: address street/city/state(new)/zip/country; radios from methods; quote-driven totals (drop TAX_RATE).
- [ ] 3.11 `site-footer.tsx` → `app/api/newsletter/route.ts`; `lib/format.ts`,`lib/seo.ts`,`dictionaries.ts` currency from `/config` (drop COP). Verify build/typecheck.

## Slice 4 — Admin UI (apps/admin)

- [ ] 4.1 API helpers + new `src/components/products/VariantsEditor.tsx` wired into `dashboard/products/[id]/page.tsx`.
- [ ] 4.2 New `dashboard/categories/page.tsx` (tree; 409→toast) + nav.
- [ ] 4.3 `ProductForm.tsx` + bulk import weight (kg); `settings/page.tsx` "Currency: USD". Verify tests+build.
