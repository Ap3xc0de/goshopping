import { getTemplate } from '../registry';
import { buildTemplateCSSVars } from '../theme-css';
import type { TemplateManifest } from '../types';

const minimal = getTemplate('minimal');

describe('buildTemplateCSSVars — nav colors (BRAND-05)', () => {
  it('emits --brand-nav-bg/--brand-nav-text from the manifest nav colors when present', () => {
    const vars = buildTemplateCSSVars(minimal);
    expect(vars['--brand-nav-bg']).toBe(minimal.colors.navBackground);
    expect(vars['--brand-nav-text']).toBe(minimal.colors.navText);
  });

  it('falls back to background/foreground when the manifest has no dedicated nav colors', () => {
    const withoutNavColors: TemplateManifest = {
      ...minimal,
      colors: { ...minimal.colors, navBackground: undefined, navText: undefined },
    };
    const vars = buildTemplateCSSVars(withoutNavColors);
    expect(vars['--brand-nav-bg']).toBe(minimal.colors.background);
    expect(vars['--brand-nav-text']).toBe(minimal.colors.foreground);
  });
});

describe('buildTemplateCSSVars — fonts (BRAND-07)', () => {
  it('maps Poppins to --font-poppins', () => {
    const template: TemplateManifest = {
      ...minimal,
      fonts: { heading: 'Poppins', body: minimal.fonts.body },
    };
    const vars = buildTemplateCSSVars(template);
    expect(vars['--font-heading']).toContain('--font-poppins');
  });

  it('maps Outfit to --font-outfit', () => {
    const template: TemplateManifest = {
      ...minimal,
      fonts: { heading: minimal.fonts.heading, body: 'Outfit' },
    };
    const vars = buildTemplateCSSVars(template);
    expect(vars['--font-body']).toContain('--font-outfit');
  });
});

describe('buildTemplateCSSVars — brand radius (BRAND-08)', () => {
  // `minimal.style.borderRadius` is 'sharp', whose family is
  // { sm: 0.125rem, md: 0.25rem, lg: 0.375rem, xl: 0.5rem } (see BORDER_RADIUS_MAP).
  it('defaults --radius to the "md" value of the template borderRadius family when no brandRadius given', () => {
    const vars = buildTemplateCSSVars(minimal);
    expect(vars['--radius']).toBe(vars['--radius-md']);
  });

  it('sets --radius to the "lg" value of the template family when brandRadius is "lg"', () => {
    const vars = buildTemplateCSSVars(minimal, { brandRadius: 'lg' });
    expect(vars['--radius']).toBe(vars['--radius-lg']);
  });

  it('sets --radius to the "sm" value of the template family when brandRadius is "sm"', () => {
    const vars = buildTemplateCSSVars(minimal, { brandRadius: 'sm' });
    expect(vars['--radius']).toBe(vars['--radius-sm']);
  });

  it('sets --radius to the "xl" value of the template family when brandRadius is "xl"', () => {
    const vars = buildTemplateCSSVars(minimal, { brandRadius: 'xl' });
    expect(vars['--radius']).toBe(vars['--radius-xl']);
  });
});
