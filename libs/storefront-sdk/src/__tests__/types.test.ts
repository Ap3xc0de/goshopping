import type { BrandColors, ProductParams } from '../types';

/**
 * BRAND-03: BrandColors (SDK) must accept nav_background/nav_text as
 * optional strings, mirroring apps/core/internal/models/branding.go#BrandColors
 * (same snake_case JSON key convention already used by the other 9 colors —
 * see the doc comment on BrandColors in ../types.ts).
 *
 * This is a compile-time contract: if nav_background/nav_text are missing
 * from BrandColors, the object literal below fails to type-check
 * (excess property check on a directly-typed literal) and `npx tsc --noEmit`
 * reports it — exactly the acceptance criteria in spec BRAND-03.
 */
describe('BrandColors (SDK) type contract', () => {
  it('accepts nav_background and nav_text as optional fields', () => {
    const colors: BrandColors = {
      primary: '142 71% 45%',
      nav_background: '220 20% 98%',
      nav_text: '220 20% 10%',
    };

    expect(colors.nav_background).toBe('220 20% 98%');
    expect(colors.nav_text).toBe('220 20% 10%');
  });

  it('still allows omitting nav_background/nav_text (optional)', () => {
    const colors: BrandColors = { primary: '142 71% 45%' };

    expect(colors.nav_background).toBeUndefined();
    expect(colors.nav_text).toBeUndefined();
  });
});

/**
 * W4 (hardening slice 10): `apps/storefront/src/app/[storeSlug]/page.tsx`
 * called `useProducts(storeSlug, { limit: 8 })` — Go's `ListProducts` only
 * ever reads `per_page` (see apps/core/internal/handlers/product.go), so
 * `limit` was silently ignored and the homepage never actually capped to 8
 * products. The runtime bug was already fixed (commit 368763d), but nothing
 * stopped it from regressing — `limit` was still a legal `ProductParams`
 * key. This is a compile-time contract, same pattern as BrandColors above:
 * if `limit` is ever re-added to `ProductParams`, the excess-property check
 * fails and `@ts-expect-error` below reports an "unused directive" error,
 * which `npx tsc --noEmit` catches.
 */
describe('ProductParams (SDK) type contract', () => {
  it('rejects "limit" — Go only reads per_page, so this key class of bug cannot compile again', () => {
    // @ts-expect-error — `limit` is not (and must never become) a valid
    // ProductParams key; the correct key is `per_page`.
    const params: ProductParams = { limit: 8 };

    expect(params).toBeDefined();
  });

  it('accepts per_page — the actual param Go reads', () => {
    const params: ProductParams = { per_page: 8 };

    expect(params.per_page).toBe(8);
  });
});
