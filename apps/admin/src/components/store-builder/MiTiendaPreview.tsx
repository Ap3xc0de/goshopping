import { getTemplate, mergeThemeConfig, buildTemplateCSSVars } from '@goshopping/template-catalog';
import type { CSSProperties } from 'react';
import type { StoreBranding } from '@/lib/types';

const minimalTemplate = getTemplate('minimal');

interface MiTiendaPreviewProps {
  /** Draft branding straight from the editor's form state — updates on every keystroke, no save needed (ADMIN-03). */
  branding: StoreBranding;
  storeName?: string;
}

/**
 * Live miniature of the storefront, built on the exact same
 * `mergeThemeConfig`/`buildTemplateCSSVars` pipeline the real storefront SSR
 * uses (`@goshopping/template-catalog`, design decision 11) — unlike
 * `StorePreview.tsx` (only handles 3 hex colors, used by the create-store
 * wizard's Marca step), this renders nav/hero/products/footer against the
 * full set of CSS vars so every branding field the "Mi Tienda" editor
 * exposes (11 colors, fonts, radius) is visible in the preview.
 */
export function MiTiendaPreview({ branding, storeName }: MiTiendaPreviewProps) {
  const theme = mergeThemeConfig(branding, minimalTemplate);
  const brandRadius = (branding.radius as 'sm' | 'md' | 'lg' | 'xl' | undefined) ?? 'md';
  const cssVars = buildTemplateCSSVars(theme.manifest, { brandRadius });
  const name = storeName || branding.brand_name || 'Tu Tienda';

  return (
    <div
      className="w-full h-full min-h-[420px] rounded-xl border border-gray-200 overflow-hidden bg-white flex flex-col"
      style={cssVars as CSSProperties}
      data-testid="mi-tienda-preview"
    >
      {/* Nav — BRAND-05/BRAND-06: dedicated nav colors, not bg-white */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{
          backgroundColor: 'hsl(var(--brand-nav-bg))',
          color: 'hsl(var(--brand-nav-text))',
        }}
      >
        <span className="font-bold text-lg truncate" style={{ fontFamily: 'var(--font-heading)' }}>
          {name}
        </span>
        <div className="flex gap-4 text-sm opacity-80">
          <span>Inicio</span>
          <span>Catálogo</span>
          <span>Contacto</span>
        </div>
      </nav>

      {/* Hero */}
      <div
        className="px-6 py-10 text-center"
        style={{ backgroundColor: 'hsl(var(--surface-background))' }}
      >
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--brand-primary))' }}
        >
          {name}
        </h1>
        <p
          className="text-sm mb-5 opacity-70"
          style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--surface-foreground))' }}
        >
          {branding.tagline || 'Bienvenido a nuestra tienda'}
        </p>
        <button
          type="button"
          className="text-sm font-medium px-5 py-2"
          style={{
            backgroundColor: 'hsl(var(--brand-primary))',
            color: 'hsl(var(--brand-primary-foreground))',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Ver catálogo
        </button>
      </div>

      {/* Mock product grid — radius-aware placeholders */}
      <div
        className="px-6 py-4 flex-1"
        style={{ backgroundColor: 'hsl(var(--surface-background))' }}
      >
        <p className="text-xs mb-3 font-medium uppercase tracking-wider opacity-50">
          Productos destacados
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden border"
              style={{ borderRadius: 'var(--radius)', borderColor: 'hsl(var(--surface-muted))' }}
            >
              <div
                className="h-16 opacity-25"
                style={{ backgroundColor: 'hsl(var(--brand-accent))' }}
              />
              <div className="p-2">
                <div
                  className="h-2 rounded mb-1"
                  style={{ backgroundColor: 'hsl(var(--surface-muted))' }}
                />
                <div
                  className="h-2 rounded w-2/3"
                  style={{ backgroundColor: 'hsl(var(--surface-muted))' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer — same nav colors, mirrors the real storefront's Footer.tsx */}
      <footer
        className="px-6 py-4 text-xs text-center"
        style={{
          backgroundColor: 'hsl(var(--brand-nav-bg))',
          color: 'hsl(var(--brand-nav-text))',
        }}
      >
        © {new Date().getFullYear()} {name}
      </footer>
    </div>
  );
}
