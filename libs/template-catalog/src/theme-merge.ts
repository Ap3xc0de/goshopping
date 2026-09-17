import type { TemplateManifest } from './types';

/**
 * Structural shape of a store's branding, matching the JSON produced by
 * `apps/core/internal/models/branding.go` (snake_case, `omitempty`) closely
 * enough for merge purposes. Deliberately NOT imported from
 * `@goshopping/storefront-sdk` — this package must stay usable from
 * `apps/admin`, which never depends on the storefront SDK. Both
 * `@goshopping/storefront-sdk`'s `StoreBranding` and `apps/admin`'s own
 * `StoreBranding` (lib/types.ts) satisfy this shape structurally.
 */
export interface MergeableBrandColors {
  primary?: string;
  primary_foreground?: string;
  secondary?: string;
  secondary_foreground?: string;
  accent?: string;
  accent_foreground?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  nav_background?: string;
  nav_text?: string;
}

export interface MergeableBrandFonts {
  heading?: string;
  body?: string;
}

export interface MergeableBranding {
  colors?: MergeableBrandColors;
  fonts?: MergeableBrandFonts;
  tagline?: string;
}

/**
 * A value counts as "set" if it's a non-empty string. Branding fields all
 * use Go's `omitempty` (branding.go), so an unset field is either absent or
 * an empty string — both must fall through to the template default
 * (REQ-RENDER-03), never win as an empty override.
 */
function isSet(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Generic field-by-field merge: for each `[templateKey, brandKey]` pair in
 * `fieldMap`, the branding value wins if set, otherwise the template
 * default is kept.
 *
 * A field map (rather than assuming `brand` and `template` share the same
 * key names) is necessary because they don't: `TemplateManifest.colors`
 * uses camelCase (`primaryForeground`) while branding mirrors the Go JSON
 * tags in snake_case (`primary_foreground`).
 */
export function mergeField<TplKey extends string, BrandKey extends string>(
  fieldMap: ReadonlyArray<readonly [TplKey, BrandKey]>,
  brand: Partial<Record<BrandKey, string>> | undefined,
  template: Partial<Record<TplKey, string>>,
): Partial<Record<TplKey, string>> {
  const merged = { ...template };
  for (const [templateKey, brandKey] of fieldMap) {
    const value = brand?.[brandKey];
    if (isSet(value)) {
      merged[templateKey] = value;
    }
  }
  return merged;
}

const COLOR_FIELD_MAP = [
  ['primary', 'primary'],
  ['primaryForeground', 'primary_foreground'],
  ['secondary', 'secondary'],
  ['secondaryForeground', 'secondary_foreground'],
  ['accent', 'accent'],
  ['accentForeground', 'accent_foreground'],
  ['background', 'background'],
  ['foreground', 'foreground'],
  ['muted', 'muted'],
  // BRAND-04: dedicated Navbar colors merge with the same isSet rule as the
  // other 9 — optional on both sides, since archived templates may have no
  // default (buildTemplateCSSVars applies the background/foreground
  // fallback for those — not this merge step).
  ['navBackground', 'nav_background'],
  ['navText', 'nav_text'],
] as const satisfies ReadonlyArray<
  readonly [keyof TemplateManifest['colors'], keyof MergeableBrandColors]
>;

const FONT_FIELD_MAP = [
  ['heading', 'heading'],
  ['body', 'body'],
] as const satisfies ReadonlyArray<readonly [keyof TemplateManifest['fonts'], keyof MergeableBrandFonts]>;

export interface ResolvedTheme {
  /**
   * A full `TemplateManifest` with `colors`/`fonts` merged against
   * branding. Composition fields (`components`, `homeSections`, `style`)
   * are always the template's own — spreading `template` first and only
   * overriding `colors`/`fonts` makes that guarantee structural, not just
   * a convention to remember (REQ-RENDER-04).
   */
  manifest: TemplateManifest;
  tagline: string;
}

/**
 * Merges a store's branding over its template's defaults.
 *
 * Not merged into `ResolvedTheme`: `radius` and `social_links`. `radius`
 * selects one of the template's own border-radius presets rather than a
 * `TemplateManifest` field — it's applied directly as a
 * `buildTemplateCSSVars(manifest, { brandRadius })` option by callers
 * (BRAND-08), not merged into the manifest here. `logo_url`/`favicon_url`
 * are consumed directly from `branding` by callers that need them (no
 * template default applies — "logo is 100% brand").
 */
export function mergeThemeConfig(
  branding: MergeableBranding | undefined,
  template: TemplateManifest,
): ResolvedTheme {
  const colors = mergeField(COLOR_FIELD_MAP, branding?.colors, template.colors);
  const fonts = mergeField(FONT_FIELD_MAP, branding?.fonts, template.fonts);
  const tagline = isSet(branding?.tagline) ? (branding!.tagline as string) : template.description;

  return {
    // `colors`/`fonts` come back typed as `Partial<...>` because `mergeField`
    // is generic over any field map — but by construction every *required*
    // TemplateManifest field is always present: mergeField starts from
    // `{ ...template }`, which already has them, and only ever overwrites
    // (never deletes) a key. The cast is narrowing back to what's
    // runtime-true, not asserting something new.
    manifest: { ...template, colors, fonts } as TemplateManifest,
    tagline,
  };
}
