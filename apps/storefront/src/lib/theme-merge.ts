import type { TemplateManifest } from '@goshopping/template-catalog';
import type { StoreBranding } from '@goshopping/storefront-sdk/client';

/**
 * A value counts as "set" if it's a non-empty string. `StoreBranding`'s
 * fields all use Go's `omitempty` (branding.go), so an unset field is
 * either absent or an empty string — both must fall through to the
 * template default (REQ-RENDER-03), never win as an empty override.
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
 * key names) is necessary because they don't:
 * `TemplateManifest.colors` uses camelCase (`primaryForeground`) while
 * `StoreBranding.colors` mirrors the Go JSON tags in snake_case
 * (`primary_foreground`) — same convention apps/admin/src/lib/types.ts
 * already uses for the same struct. A naive `Object.keys(template)` loop
 * would silently never match those 3 fields.
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
  // other 9 — optional on both sides (TemplateManifest.colors.navBackground/
  // navText are optional, unlike the 9 required colors above), since
  // archived templates may have no default (BuildTemplateCSSVars applies
  // the background/foreground fallback for those — not this merge step).
  ['navBackground', 'nav_background'],
  ['navText', 'nav_text'],
] as const satisfies ReadonlyArray<
  readonly [keyof TemplateManifest['colors'], keyof NonNullable<StoreBranding['colors']>]
>;

const FONT_FIELD_MAP = [
  ['heading', 'heading'],
  ['body', 'body'],
] as const satisfies ReadonlyArray<
  readonly [keyof TemplateManifest['fonts'], keyof NonNullable<StoreBranding['fonts']>]
>;

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
 * Not merged into `ResolvedTheme` in this slice: `StoreBranding.radius`
 * ("sm"|"md"|"lg"|"xl") and `social_links`. `radius` selects one of the
 * template's own border-radius presets rather than a `TemplateManifest`
 * field — it's applied directly as a `buildTemplateCSSVars(manifest,
 * { brandRadius })` option by callers (e.g. `[storeSlug]/layout.tsx`),
 * not merged into the manifest here (BRAND-08). `logo_url`/`favicon_url`
 * are consumed directly from `branding` by callers that need them (no
 * template default applies — "logo is 100% brand").
 */
export function mergeThemeConfig(
  branding: StoreBranding | undefined,
  template: TemplateManifest,
): ResolvedTheme {
  const colors = mergeField(COLOR_FIELD_MAP, branding?.colors, template.colors);
  const fonts = mergeField(FONT_FIELD_MAP, branding?.fonts, template.fonts);
  const tagline = isSet(branding?.tagline) ? (branding!.tagline as string) : template.description;

  return {
    // `colors`/`fonts` come back typed as `Partial<...>` because `mergeField`
    // is generic over any field map, including the optional navBackground/
    // navText pair — but by construction every *required* TemplateManifest
    // field (primary, primaryForeground, ..., heading, body) is always
    // present: mergeField starts from `{ ...template }`, which already has
    // them, and only ever overwrites (never deletes) a key. The cast is
    // narrowing back to what's runtime-true, not asserting something new.
    manifest: { ...template, colors, fonts } as TemplateManifest,
    tagline,
  };
}
