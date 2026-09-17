import { GoShoppingClient } from '@goshopping/storefront-sdk/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { resolveTemplate, DEFAULT_TEMPLATE_ID } from '@/lib/resolve-template';
import { mergeThemeConfig } from '@/lib/theme-merge';
import { buildTemplateCSSVars } from '@/lib/template-css';

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
  const cssVars = buildTemplateCSSVars(theme.manifest);
  const inlineStyle = `:root{${Object.entries(cssVars)
    .map(([key, value]) => `${key}:${value};`)
    .join('')}}`;

  const navLinks = [
    { label: 'Inicio', href: `/${storeSlug}` },
    { label: 'Catálogo', href: `/${storeSlug}/catalogo` },
  ];

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: inlineStyle }} />
      <Navbar
        variant={theme.manifest.components.navbar}
        logo={{ text: storeConfig.name, href: `/${storeSlug}` }}
        links={navLinks}
      />
      <main>{children}</main>
      <Footer
        variant={theme.manifest.components.footer}
        storeName={storeConfig.name}
        tagline={theme.tagline}
      />
    </>
  );
}
