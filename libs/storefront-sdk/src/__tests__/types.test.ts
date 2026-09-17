import type { BrandColors } from '../types';

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
