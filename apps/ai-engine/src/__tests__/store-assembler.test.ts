import { StoreAssembler } from '../services/store-assembler';
import { StoreGenerationResult } from '../services/generation-pipeline';
import { StoreConfig } from '../services/store-config-builder';

const mockConfig: StoreConfig = {
  name: 'Tienda Demo',
  category: 'moda',
  style: 'minimal',
  colors: { primary: '142 71% 45%', secondary: '322 71% 45%', accent: '202 71% 45%' },
  tagline: 'La mejor tienda',
  logo_url: null,
  pages: ['inicio', 'catalogo', 'nosotros'],
};

const mockResult: StoreGenerationResult = {
  success: true,
  pages: [
    { name: 'HomePage', code: "export default function HomePage() { return <div>Home</div>; }", validated: true },
    { name: 'CatalogPage', code: "'use client';\nexport default function CatalogPage() { return <div>Catalog</div>; }", validated: true },
    { name: 'AboutPage', code: "export default function AboutPage() { return <div>About</div>; }", validated: true },
  ],
  cssVariables: {
    '--brand-primary': '142 71% 45%',
    '--brand-secondary': '322 71% 45%',
    '--brand-accent': '202 71% 45%',
    '--font-heading': 'Playfair Display',
    '--font-body': 'Inter',
  },
  errors: [],
  threats: [],
};

describe('StoreAssembler', () => {
  let assembler: StoreAssembler;

  beforeEach(() => {
    assembler = new StoreAssembler();
  });

  it('returns an AssembledStore with correct metadata', () => {
    const result = assembler.assemble(mockResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    expect(result.storeSlug).toBe('tienda-demo');
    expect(result.storeId).toBe('store-123');
    expect(result.templateId).toBe('minimal');
    expect(result.storeConfig).toEqual(mockConfig);
    expect(result.assembledAt).toBeTruthy();
  });

  it('creates globals.css with CSS variables', () => {
    const result = assembler.assemble(mockResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    const css = result.files.find((f) => f.path === 'app/globals.css');
    expect(css).toBeDefined();
    expect(css?.content).toContain('--brand-primary');
    expect(css?.content).toContain('142 71% 45%');
    expect(css?.content).toContain('@tailwind base');
  });

  it('creates root layout with CSS variables as inline style', () => {
    const result = assembler.assemble(mockResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    const layout = result.files.find((f) => f.path === 'app/layout.tsx');
    expect(layout).toBeDefined();
    expect(layout?.content).toContain('--brand-primary');
    expect(layout?.content).toContain('CartProvider');
    expect(layout?.content).toContain("lang=\"es\"");
  });

  it('maps page names to correct Next.js routes', () => {
    const result = assembler.assemble(mockResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain('app/page.tsx');         // HomePage
    expect(paths).toContain('app/catalogo/page.tsx'); // CatalogPage
    expect(paths).toContain('app/nosotros/page.tsx'); // AboutPage
  });

  it('wraps pages that lack "use client" with the directive', () => {
    const result = assembler.assemble(mockResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    const home = result.files.find((f) => f.path === 'app/page.tsx');
    expect(home?.content).toContain("'use client'");
  });

  it('does not duplicate "use client" when already present', () => {
    const result = assembler.assemble(mockResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    const catalog = result.files.find((f) => f.path === 'app/catalogo/page.tsx');
    const occurrences = (catalog?.content.match(/use client/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it('creates a CartProvider file', () => {
    const result = assembler.assemble(mockResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    const provider = result.files.find((f) => f.path === 'app/providers/CartProvider.tsx');
    expect(provider).toBeDefined();
    expect(provider?.content).toContain('useCart');
    expect(provider?.content).toContain('tienda-demo');
  });

  it('creates a lib/store-config.ts file with config + slug', () => {
    const result = assembler.assemble(mockResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    const cfg = result.files.find((f) => f.path === 'lib/store-config.ts');
    expect(cfg).toBeDefined();
    expect(cfg?.content).toContain('Tienda Demo');
    expect(cfg?.content).toContain("storeSlug = 'tienda-demo'");
  });

  it('only generates pages that are in the generation result', () => {
    const minimalResult: StoreGenerationResult = {
      ...mockResult,
      pages: [{ name: 'HomePage', code: "export default function HomePage() { return <div />; }", validated: true }],
    };
    const result = assembler.assemble(minimalResult, mockConfig, 'tienda-demo', 'store-123', 'minimal');
    const pagePaths = result.files.filter((f) => f.type === 'page').map((f) => f.path);
    expect(pagePaths).toHaveLength(1);
    expect(pagePaths[0]).toBe('app/page.tsx');
  });

  describe('pageNameToRoute', () => {
    it.each([
      ['HomePage', ''],
      ['CatalogPage', 'catalogo'],
      ['ProductPage', 'producto/[id]'],
      ['CheckoutPage', 'checkout'],
      ['AboutPage', 'nosotros'],
      ['ContactPage', 'contacto'],
      ['FAQPage', 'faq'],
    ])('%s → %s', (input, expected) => {
      expect(assembler.pageNameToRoute(input)).toBe(expected);
    });
  });
});
