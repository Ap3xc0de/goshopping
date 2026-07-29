/**
 * @jest-environment jsdom
 *
 * Tests for the [storeSlug] dynamic routes: HomePage, CatalogPage, Layout.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Mock next/navigation ─────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useParams: () => ({ storeSlug: 'test-store', id: 'product-123' }),
  useRouter: () => ({ push: jest.fn() }),
}));

// ── Mock @goshopping/storefront-sdk ──────────────────────────────────────────
jest.mock('@goshopping/storefront-sdk', () => ({
  useStoreConfig: jest.fn(() => ({
    config: {
      name: 'Test Store',
      category: 'moda',
      tagline: 'La mejor moda',
      colors: { primary: '142 71% 45%', secondary: '322 71% 45%', accent: '202 71% 45%' },
      style: 'minimal',
      pages: ['inicio', 'catalogo'],
      logo_url: null,
    },
    loading: false,
    error: null,
  })),
  useProducts: jest.fn(() => ({
    products: [
      {
        id: 'p1',
        name: 'Producto Uno',
        price: 59000,
        compare_at_price: undefined,
        images: [{ url: '/img/p1.jpg' }],
      },
      {
        id: 'p2',
        name: 'Producto Dos',
        price: 89000,
        compare_at_price: undefined,
        images: [{ url: '/img/p2.jpg' }],
      },
    ],
    loading: false,
    error: null,
    total: 2,
    setSearch: jest.fn(),
    setCategory: jest.fn(),
    setPage: jest.fn(),
    page: 1,
    totalPages: 1,
    setSort: jest.fn(),
    refresh: jest.fn(),
  })),
  useCart: jest.fn(() => ({
    cart: { items: [] },
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
  })),
  useProduct: jest.fn(() => ({
    product: {
      id: 'product-123',
      name: 'Camisa Azul',
      price: 89000,
      description: 'Una camisa hermosa',
      images: [{ url: '/img/camisa.jpg' }],
    },
    loading: false,
    error: null,
  })),
}));

// ── Mock next/image ──────────────────────────────────────────────────────────
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

// ── Mock next/link ───────────────────────────────────────────────────────────
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Mock Navbar and Footer to isolate route pages ────────────────────────────
jest.mock('@/components/layout/Navbar', () => ({
  Navbar: ({ logo }: { logo: { text: string } }) => <nav data-testid="navbar">{logo.text}</nav>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: ({ storeName }: { storeName: string }) => <footer data-testid="footer">{storeName}</footer>,
}));

// ── Import pages AFTER mocks ─────────────────────────────────────────────────
import StorefrontHomePage from '@/app/[storeSlug]/page';
import CatalogPage from '@/app/[storeSlug]/catalogo/page';
import StoreLayout from '@/app/[storeSlug]/layout';
import ProductPage from '@/app/[storeSlug]/producto/[id]/page';

describe('[storeSlug] HomePage', () => {
  it('renders HeroCentered section', () => {
    render(<StorefrontHomePage />);
    // HeroCentered renders the store name as a heading
    expect(screen.getByText('Test Store')).toBeInTheDocument();
  });

  it('renders product grid with products from useProducts', () => {
    render(<StorefrontHomePage />);
    expect(screen.getByText('Producto Uno')).toBeInTheDocument();
    expect(screen.getByText('Producto Dos')).toBeInTheDocument();
  });

  it('renders TrustBadges section', () => {
    render(<StorefrontHomePage />);
    // TrustBadges has "Pago seguro" by default
    expect(screen.getByText(/Pago seguro/i)).toBeInTheDocument();
  });

  it('renders newsletter section', () => {
    render(<StorefrontHomePage />);
    expect(screen.getByText(/Suscríbete/i)).toBeInTheDocument();
  });
});

describe('[storeSlug] CatalogPage', () => {
  it('renders heading "Catálogo"', () => {
    render(<CatalogPage />);
    expect(screen.getByText('Catálogo')).toBeInTheDocument();
  });

  it('renders product cards from useProducts', () => {
    render(<CatalogPage />);
    expect(screen.getByText('Producto Uno')).toBeInTheDocument();
    expect(screen.getByText('Producto Dos')).toBeInTheDocument();
  });

  it('shows total product count', () => {
    render(<CatalogPage />);
    expect(screen.getByText(/2 productos/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<CatalogPage />);
    expect(screen.getByPlaceholderText(/Buscar productos/i)).toBeInTheDocument();
  });
});

describe('[storeSlug] StoreLayout', () => {
  it('renders Navbar with store name', () => {
    render(
      <StoreLayout>
        <div>contenido</div>
      </StoreLayout>,
    );
    expect(screen.getByTestId('navbar')).toHaveTextContent('Test Store');
  });

  it('renders Footer with store name', () => {
    render(
      <StoreLayout>
        <div>contenido</div>
      </StoreLayout>,
    );
    expect(screen.getByTestId('footer')).toHaveTextContent('Test Store');
  });

  it('renders children inside main', () => {
    render(
      <StoreLayout>
        <div data-testid="child">Hijo</div>
      </StoreLayout>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('[storeSlug]/producto/[id] ProductPage', () => {
  it('renders product name', () => {
    render(<ProductPage />);
    expect(screen.getByText('Camisa Azul')).toBeInTheDocument();
  });

  it('renders product price', () => {
    render(<ProductPage />);
    expect(screen.getByText(/89\.000/)).toBeInTheDocument();
  });

  it('renders Add to Cart button', () => {
    render(<ProductPage />);
    expect(screen.getByText(/Agregar al carrito/i)).toBeInTheDocument();
  });

  it('renders back link to catalog', () => {
    render(<ProductPage />);
    const backLink = screen.getByText(/Volver al catálogo/i).closest('a');
    expect(backLink).toHaveAttribute('href', '/test-store/catalogo');
  });
});
