import type { TemplateManifest } from '@goshopping/template-catalog';
import { buildTemplateCSSVars } from '@goshopping/template-catalog';

/**
 * Re-exported from `@goshopping/template-catalog` (design decision 10/11):
 * the CSS var derivation is now a shared pure module so `apps/admin`'s "Mi
 * Tienda" preview (Slice 8) can produce the exact same output as this
 * storefront's SSR render. Keep importing `buildTemplateCSSVars` from
 * `@/lib/template-css` in this app — only the implementation moved.
 */
export { buildTemplateCSSVars };

/**
 * Applies template CSS variables to a DOM element (e.g. document.documentElement).
 * Call from a useEffect in client components.
 *
 * Stays storefront-local (not moved to the shared lib): it touches the DOM
 * directly, which the shared `template-catalog` package has no dependency
 * on and shouldn't gain just for this helper.
 */
export function applyTemplateCSSVars(
  config: TemplateManifest,
  element: HTMLElement = document.documentElement,
): void {
  const vars = buildTemplateCSSVars(config);
  Object.entries(vars).forEach(([prop, value]) => {
    element.style.setProperty(prop, value);
  });
}
