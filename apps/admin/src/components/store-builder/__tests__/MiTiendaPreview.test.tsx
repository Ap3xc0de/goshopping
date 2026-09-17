import { render, screen } from '@testing-library/react';
import { MiTiendaPreview } from '../MiTiendaPreview';
import type { StoreBranding } from '@/lib/types';

/**
 * ADMIN-03: unlike StorePreview.tsx (only 3 hex colors, no nav/radius/fonts
 * — see design "Open Questions" resolved in tasks obs #1113), this preview
 * consumes `buildTemplateCSSVars`/`mergeThemeConfig` from
 * `@goshopping/template-catalog`, the exact same derivation the real
 * storefront SSR uses, so it can render every brand field the editor
 * exposes.
 */
describe('MiTiendaPreview', () => {
  it('renders nav, hero, product placeholders and footer with the store name', () => {
    render(<MiTiendaPreview branding={{}} storeName="Tienda Demo" />);
    expect(screen.getByTestId('mi-tienda-preview')).toBeInTheDocument();
    expect(screen.getAllByText('Tienda Demo').length).toBeGreaterThan(0);
  });

  it('reflects an edited primary color as a CSS var on the preview root immediately (ADMIN-03)', () => {
    const branding: StoreBranding = { colors: { primary: '10 80% 40%' } };
    render(<MiTiendaPreview branding={branding} storeName="Tienda Demo" />);
    const root = screen.getByTestId('mi-tienda-preview');
    expect(root.style.getPropertyValue('--brand-primary')).toBe('10 80% 40%');
  });

  it('reflects nav_background/nav_text overrides as dedicated CSS vars (BRAND-05)', () => {
    const branding: StoreBranding = {
      colors: { nav_background: '0 0% 20%', nav_text: '0 0% 95%' },
    };
    render(<MiTiendaPreview branding={branding} />);
    const root = screen.getByTestId('mi-tienda-preview');
    expect(root.style.getPropertyValue('--brand-nav-bg')).toBe('0 0% 20%');
    expect(root.style.getPropertyValue('--brand-nav-text')).toBe('0 0% 95%');
  });

  it('reflects the radius selection as the generic --radius var (BRAND-08)', () => {
    const branding: StoreBranding = { radius: 'xl' };
    render(<MiTiendaPreview branding={branding} />);
    const root = screen.getByTestId('mi-tienda-preview');
    // 'minimal' template's borderRadius family is 'sharp' -> xl = 0.5rem
    expect(root.style.getPropertyValue('--radius')).toBe('0.5rem');
  });

  it('falls back to the minimal template defaults when branding has no colors set', () => {
    render(<MiTiendaPreview branding={{}} />);
    const root = screen.getByTestId('mi-tienda-preview');
    expect(root.style.getPropertyValue('--brand-primary')).toBe('0 0% 9%');
  });
});
