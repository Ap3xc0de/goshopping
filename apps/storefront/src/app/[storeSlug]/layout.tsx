import { GoShoppingClient } from '@goshopping/storefront-sdk/client';
import { StorefrontChrome } from '@/components/layout/StorefrontChrome';
import { resolveTemplate, DEFAULT_TEMPLATE_ID } from '@/lib/resolve-template';
import { mergeThemeConfig } from '@/lib/theme-merge';
import { buildTemplateCSSVars } from '@/lib/template-css';

const VALID_BRAND_RADII = new Set(['sm', 'md', 'lg', 'xl']);

/**
 * `StoreBranding.radius` is a plain `string` on the SDK type (mirrors Go's
 * loosely-typed JSON field) — narrow it to the literal union
 * `buildTemplateCSSVars` expects, falling back to `undefined` (which that
 * function itself defaults to "md") for anything unset or invalid rather
 * than trusting an unvalidated value from the API (BRAND-08).
 */
function toBrandRadius(radius: string | undefined): 'sm' | 'md' | 'lg' | 'xl' | undefined {
  return VALID_BRAND_RADII.has(radius ?? '') ? (radius as 'sm' | 'md' | 'lg' | 'xl') : undefined;
}

/**
 * Server Component (REQ-RENDER-02): branding CSS custom properties are
 * injected into a `<style>` tag during SSR, before the HTML reaches the
 * browser — that's the FOUC fix. The old client-only version applied
 * colors via `useEffect` + `document.documentElement`, which painted a
 * frame with default colors first.
 *
 * `GoShoppingClient` is imported from the `./client` subpath, never the
 * `@goshopping/storefront-sdk` barrel (which also re-exports `./hooks`,
 * a `'use client'` module) — see spike #1097.
 */
export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storeSlug: string };
}) {
  const { storeSlug } = params;
  const client = new GoShoppingClient({ storeSlug });
  const storeConfig = await client.getStoreConfig();

  const template = resolveTemplate(storeConfig.template_id ?? DEFAULT_TEMPLATE_ID, {
    storeId: storeConfig.id,
  });
  const theme = mergeThemeConfig(storeConfig.branding, template);
  const cssVars = buildTemplateCSSVars(theme.manifest, {
    brandRadius: toBrandRadius(storeConfig.branding?.radius),
  });
  const inlineStyle = `:root{${Object.entries(cssVars)
    .map(([key, value]) => `${key}:${value};`)
    .join('')}}`;

  const navLinks = [
    { label: 'Inicio', href: `/${storeSlug}` },
    { label: 'Catálogo', href: `/${storeSlug}/catalogo` },
  ];

  return (
    // W2 (hardening slice 10): apply the brand's body font at the layout
    // root so every descendant inherits it via Tailwind's `font-body`
    // utility (mapped to `--font-body` in tailwind.config.ts). Headings
    // keep overriding it locally with `font-heading`. Previously nothing
    // in the storefront ever used `font-body`, so a merchant picking a
    // distinct body font saw zero visual change.
    <div className="font-body">
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: inlineStyle }} />
      {/* CART-01..06: StorefrontChrome is the Client Component that wires the
          real, localStorage-backed cart (useCart) into Navbar/CartDrawer —
          this Server Component only instantiates it (design decision 12). */}
      <StorefrontChrome
        storeSlug={storeSlug}
        navbarVariant={theme.manifest.components.navbar}
        footerVariant={theme.manifest.components.footer}
        logo={{ text: storeConfig.name, href: `/${storeSlug}` }}
        navLinks={navLinks}
        storeName={storeConfig.name}
        tagline={theme.tagline}
      >
        {children}
      </StorefrontChrome>
    </div>
  );
}
