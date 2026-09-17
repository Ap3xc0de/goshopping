/**
 * REQ-RENDER-02 — [storeSlug]/layout.tsx is a Server Component: branding
 * CSS custom properties must be present in the initial server-rendered
 * HTML (the FOUC fix), never applied later via useEffect.
 *
 * Server Components can't be invoked through JSX + RTL's synchronous
 * render() (an async function component returns a Promise, not an
 * element). This file calls StoreLayout as a plain async function, awaits
 * the resolved element tree, and renders that result — the standard
 * pattern for testing RSCs under Jest/jsdom.
 */
import { readFileSync } from 'fs';
import path from 'path';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { StoreConfig } from '@goshopping/storefront-sdk/client';

const mockGetStoreConfig = jest.fn();

jest.mock('@goshopping/storefront-sdk/client', () => ({
  GoShoppingClient: jest.fn().mockImplementation(() => ({
    getStoreConfig: mockGetStoreConfig,
  })),
}));

jest.mock('@/components/layout/Navbar', () => ({
  Navbar: ({ logo, variant }: { logo: { text: string }; variant?: string }) => (
    <nav data-testid="navbar" data-variant={variant}>
      {logo.text}
    </nav>
  ),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: ({ storeName, variant }: { storeName: string; variant?: string }) => (
    <footer data-testid="footer" data-variant={variant}>
      {storeName}
    </footer>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
import StoreLayout from '@/app/[storeSlug]/layout';

const baseStoreConfig: StoreConfig = {
  id: 'store-1',
  name: 'Test Store',
  slug: 'test-store',
  template_id: 'minimal',
  branding: {},
  config: {} as StoreConfig['config'],
};

async function renderLayout(
  children: ReactElement,
  storeSlug = 'test-store',
): Promise<ReturnType<typeof render>> {
  const jsx = await StoreLayout({ children, params: { storeSlug } });
  return render(jsx as ReactElement);
}

describe('[storeSlug] server layout', () => {
  beforeEach(() => {
    mockGetStoreConfig.mockReset();
    mockGetStoreConfig.mockResolvedValue(baseStoreConfig);
  });

  it('renders a <style> tag with branding CSS custom properties in the server-rendered output', async () => {
    const { container } = await renderLayout(<div />);

    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();
    expect(styleTag!.innerHTML).toContain('--brand-primary');
  });

  it('does not use the "use client" directive or useEffect to apply colors', () => {
    const source = readFileSync(
      path.join(__dirname, '..', 'app', '[storeSlug]', 'layout.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/^['"]use client['"]/m);
    expect(source).not.toMatch(/\buseEffect\s*\(/); // no call — a mention in a comment is fine
  });

  it('renders Navbar with the store name', async () => {
    await renderLayout(<div />);
    expect(screen.getByTestId('navbar')).toHaveTextContent('Test Store');
  });

  it('renders Footer with the store name', async () => {
    await renderLayout(<div />);
    expect(screen.getByTestId('footer')).toHaveTextContent('Test Store');
  });

  it('renders children inside main', async () => {
    await renderLayout(<div data-testid="child">Hijo</div>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it("passes the template's navbar/footer variant from the catalog manifest", async () => {
    // minimal.components = { navbar: 'transparent', footer: 'minimal', ... }
    await renderLayout(<div />);
    expect(screen.getByTestId('navbar')).toHaveAttribute('data-variant', 'transparent');
    expect(screen.getByTestId('footer')).toHaveAttribute('data-variant', 'minimal');
  });

  it('merges branding colors over the template defaults into the injected CSS vars', async () => {
    mockGetStoreConfig.mockResolvedValue({
      ...baseStoreConfig,
      branding: { colors: { primary: '10 80% 40%' } },
    });
    const { container } = await renderLayout(<div />);
    expect(container.querySelector('style')!.innerHTML).toContain('10 80% 40%');
  });

  it('falls back to the default template without crashing when template_id is unknown', async () => {
    mockGetStoreConfig.mockResolvedValue({ ...baseStoreConfig, template_id: 'no-existe' });
    await expect(renderLayout(<div />)).resolves.toBeDefined();
  });

  // BRAND-04/BRAND-05: nav colors must reach the SSR'd :root{} style tag.
  it('includes --brand-nav-bg/--brand-nav-text in the injected CSS vars', async () => {
    const { container } = await renderLayout(<div />);
    const style = container.querySelector('style')!.innerHTML;
    expect(style).toContain('--brand-nav-bg');
    expect(style).toContain('--brand-nav-text');
  });

  it('branding nav_background overrides the template default in the injected CSS vars', async () => {
    mockGetStoreConfig.mockResolvedValue({
      ...baseStoreConfig,
      branding: { colors: { nav_background: '10 10% 10%' } },
    });
    const { container } = await renderLayout(<div />);
    expect(container.querySelector('style')!.innerHTML).toContain('--brand-nav-bg:10 10% 10%');
  });

  // BRAND-08: branding.radius selects the generic --radius var.
  it('defaults --radius to "md" when branding has no radius set', async () => {
    const { container } = await renderLayout(<div />);
    const style = container.querySelector('style')!.innerHTML;
    expect(style).toMatch(/--radius:0\.25rem;/); // minimal's "sharp" family, --radius-md
  });

  it('uses branding.radius to select the --radius value from the template family', async () => {
    mockGetStoreConfig.mockResolvedValue({ ...baseStoreConfig, branding: { radius: 'lg' } });
    const { container } = await renderLayout(<div />);
    const style = container.querySelector('style')!.innerHTML;
    expect(style).toMatch(/--radius:0\.375rem;/); // minimal's "sharp" family, --radius-lg
  });

  it('ignores an invalid branding.radius value and falls back to "md"', async () => {
    mockGetStoreConfig.mockResolvedValue({ ...baseStoreConfig, branding: { radius: 'huge' } });
    const { container } = await renderLayout(<div />);
    const style = container.querySelector('style')!.innerHTML;
    expect(style).toMatch(/--radius:0\.25rem;/);
  });
});
