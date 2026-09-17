/**
 * REQ-RENDER-03 (branding merges field-by-field over template defaults) and
 * REQ-RENDER-04 (composition — components/homeSections/style — is always
 * the template's, never overridable by branding, since StoreBranding v1
 * has no such fields at all).
 */
import { getTemplate } from '@goshopping/template-catalog';
import type { StoreBranding } from '@goshopping/storefront-sdk/client';
import { mergeField, mergeThemeConfig } from '@/lib/theme-merge';

const minimal = getTemplate('minimal');

describe('mergeField', () => {
  const fieldMap = [
    ['primary', 'primary'],
    ['primaryForeground', 'primary_foreground'],
  ] as const;
  const template = { primary: '0 0% 9%', primaryForeground: '0 0% 98%' };

  it('keeps the template value when the branding field is undefined', () => {
    expect(mergeField(fieldMap, undefined, template)).toEqual(template);
  });

  it('keeps the template value when the branding field is an empty string', () => {
    expect(mergeField(fieldMap, { primary: '' }, template)).toEqual(template);
  });

  it('overrides only the branding fields that are actually set', () => {
    expect(mergeField(fieldMap, { primary: '10 80% 40%' }, template)).toEqual({
      primary: '10 80% 40%',
      primaryForeground: '0 0% 98%',
    });
  });
});

describe('mergeThemeConfig', () => {
  it('empty branding uses all template color/font defaults', () => {
    const theme = mergeThemeConfig(undefined, minimal);
    expect(theme.manifest.colors).toEqual(minimal.colors);
    expect(theme.manifest.fonts).toEqual(minimal.fonts);
    expect(theme.tagline).toBe(minimal.description);
  });

  it('overrides only the primary color when branding sets just that field', () => {
    const branding: StoreBranding = { colors: { primary: '10 80% 40%' } };
    const theme = mergeThemeConfig(branding, minimal);
    expect(theme.manifest.colors.primary).toBe('10 80% 40%');
    expect(theme.manifest.colors.secondary).toBe(minimal.colors.secondary);
  });

  it('maps branding primary_foreground (snake_case) onto the manifest primaryForeground (camelCase)', () => {
    const branding: StoreBranding = { colors: { primary_foreground: '0 0% 20%' } };
    const theme = mergeThemeConfig(branding, minimal);
    expect(theme.manifest.colors.primaryForeground).toBe('0 0% 20%');
  });

  it('branding tagline wins over the template description', () => {
    const branding: StoreBranding = { tagline: 'Mi tienda única' };
    const theme = mergeThemeConfig(branding, minimal);
    expect(theme.tagline).toBe('Mi tienda única');
  });

  it('falls back to the template description when branding tagline is empty string', () => {
    const branding: StoreBranding = { tagline: '' };
    const theme = mergeThemeConfig(branding, minimal);
    expect(theme.tagline).toBe(minimal.description);
  });

  it('fully custom branding overrides every color and font field', () => {
    const branding: StoreBranding = {
      colors: {
        primary: '1 1% 1%',
        primary_foreground: '2 2% 2%',
        secondary: '3 3% 3%',
        secondary_foreground: '4 4% 4%',
        accent: '5 5% 5%',
        accent_foreground: '6 6% 6%',
        background: '7 7% 7%',
        foreground: '8 8% 8%',
        muted: '9 9% 9%',
        nav_background: '10 10% 10%',
        nav_text: '11 11% 11%',
      },
      fonts: { heading: 'Poppins', body: 'Outfit' },
    };
    const theme = mergeThemeConfig(branding, minimal);
    expect(theme.manifest.colors).toEqual({
      primary: '1 1% 1%',
      primaryForeground: '2 2% 2%',
      secondary: '3 3% 3%',
      secondaryForeground: '4 4% 4%',
      accent: '5 5% 5%',
      accentForeground: '6 6% 6%',
      background: '7 7% 7%',
      foreground: '8 8% 8%',
      muted: '9 9% 9%',
      navBackground: '10 10% 10%',
      navText: '11 11% 11%',
    });
    expect(theme.manifest.fonts).toEqual({ heading: 'Poppins', body: 'Outfit' });
  });

  // BRAND-04
  it('nav_background/nav_text win over the manifest defaults when set', () => {
    const branding: StoreBranding = { colors: { nav_background: '0 0% 20%', nav_text: '0 0% 90%' } };
    const theme = mergeThemeConfig(branding, minimal);
    expect(theme.manifest.colors.navBackground).toBe('0 0% 20%');
    expect(theme.manifest.colors.navText).toBe('0 0% 90%');
  });

  it('empty nav_background/nav_text fall back to the manifest defaults', () => {
    const branding: StoreBranding = { colors: { nav_background: '', nav_text: '' } };
    const theme = mergeThemeConfig(branding, minimal);
    expect(theme.manifest.colors.navBackground).toBe(minimal.colors.navBackground);
    expect(theme.manifest.colors.navText).toBe(minimal.colors.navText);
  });

  it('undefined branding.colors leaves the manifest nav defaults untouched', () => {
    const theme = mergeThemeConfig(undefined, minimal);
    expect(theme.manifest.colors.navBackground).toBe(minimal.colors.navBackground);
    expect(theme.manifest.colors.navText).toBe(minimal.colors.navText);
  });

  it('composition (components/homeSections/style) is always the template\'s, regardless of branding content', () => {
    const brandingA: StoreBranding = {};
    const brandingB: StoreBranding = { colors: { primary: '10 80% 40%' }, tagline: 'Otra marca' };

    const themeA = mergeThemeConfig(brandingA, minimal);
    const themeB = mergeThemeConfig(brandingB, minimal);

    expect(themeA.manifest.components).toEqual(minimal.components);
    expect(themeB.manifest.components).toEqual(minimal.components);
    expect(themeA.manifest.homeSections).toEqual(minimal.homeSections);
    expect(themeB.manifest.homeSections).toEqual(minimal.homeSections);
    expect(themeA.manifest.style).toEqual(minimal.style);
    expect(themeB.manifest.style).toEqual(minimal.style);
  });

  it('StoreBranding has no components/homeSections/style fields to begin with (guardrail against scope creep)', () => {
    const branding: StoreBranding = {
      colors: { primary: '1 1% 1%' },
      fonts: { heading: 'Poppins' },
      tagline: 'x',
      logo_url: 'x',
      favicon_url: 'x',
      radius: 'md',
      social_links: { instagram: 'x' },
    };
    expect('components' in branding).toBe(false);
    expect('homeSections' in branding).toBe(false);
    expect('style' in branding).toBe(false);
  });
});
