import { render, screen } from '@testing-library/react';
import { StorePreview } from '../StorePreview';
import { templates, getTemplate, type TemplateManifest } from '@goshopping/template-catalog';

/**
 * REQ-CATALOG-07 (escalability contract) — trap test for T8.4.
 *
 * Registers a synthetic template at runtime (same technique as
 * libs/template-catalog/src/__tests__/scalability-contract.test.ts) and
 * proves StorePreview renders ITS fonts, not a hardcoded fallback. Before the
 * T8.5 fix, StorePreview resolved fonts from a local `FONT_MAP` keyed by the
 * 5 legacy template ids (`storeConfig.style`) — a 6th template was never in
 * that map, so the preview silently fell back to `FONT_MAP.minimal`
 * (Playfair Display / Inter) regardless of the new template's real fonts.
 * This is exactly the admin-side counterpart of REQ-CATALOG-07: adding
 * template #6 must not require touching apps/admin code.
 */
describe('StorePreview font scalability (REQ-CATALOG-07)', () => {
  const probeManifest: TemplateManifest = {
    id: '__preview_probe__',
    name: 'Preview Probe',
    description: 'Synthetic template used only to prove StorePreview does not hardcode font ids.',
    category: ['__probe__'],
    colors: {
      primary: '0 0% 0%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 0%',
      secondaryForeground: '0 0% 100%',
      accent: '0 0% 0%',
      accentForeground: '0 0% 100%',
      background: '0 0% 100%',
      foreground: '0 0% 0%',
      muted: '0 0% 90%',
    },
    fonts: { heading: 'Bebas Neue', body: 'DM Sans' },
    components: {
      navbar: 'solid',
      hero: 'centered',
      footer: 'minimal',
      productCard: 'compact',
    },
    homeSections: ['ProductGrid'],
    style: { sectionSpacing: '1rem', borderRadius: 'sharp', shadows: 'none' },
  };

  afterEach(() => {
    delete templates.__preview_probe__;
  });

  it('renders the heading font declared by a template registered after StorePreview.tsx was last touched', () => {
    templates.__preview_probe__ = probeManifest;
    const template = getTemplate('__preview_probe__');

    render(<StorePreview storeConfig={{ name: 'Tienda Probe' }} fonts={template.fonts} />);

    const heading = screen.getByText('Tienda Probe', { selector: 'h1' });
    expect(heading).toHaveStyle({ fontFamily: 'Bebas Neue' });
  });

  it('renders the body font declared by a template registered after StorePreview.tsx was last touched', () => {
    templates.__preview_probe__ = probeManifest;
    const template = getTemplate('__preview_probe__');

    const { container } = render(
      <StorePreview storeConfig={{ name: 'Tienda Probe' }} fonts={template.fonts} />,
    );

    const bodyContainer = container.querySelector('[data-testid="store-preview"] > div:last-child');
    expect(bodyContainer).toHaveStyle({ fontFamily: 'DM Sans' });
  });
});
