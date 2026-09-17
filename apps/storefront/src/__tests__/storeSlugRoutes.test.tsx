/**
 * @jest-environment jsdom
 *
 * Tests for the [storeSlug] dynamic routes: HomePage, CatalogPage, Layout.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mock next/navigation ─────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useParams: () => ({ storeSlug: 'test-store', id: 'product-123' }),
  useRouter: () => ({ push: jest.fn() }),
}));

// ── Mock @goshopping/storefront-sdk ──────────────────────────────────────────
// Spreads the REAL module first so plain classes (StockError, etc.) stay the
// actual production classes — only the 5 hooks below are overridden with
// controllable jest.fn()s. Safe: none of those real hooks are ever invoked
// (module evaluation only defines them), so this never risks the react
// duplicate-copy hook-call issue found in libs/storefront-sdk/node_modules.
jest.mock('@goshopping/storefront-sdk', () => ({
  ...jest.requireActual('@goshopping/storefront-sdk'),
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
      stock: 5,
    },
    loading: false,
    error: null,
  })),
}));

// ── Mock sonner (toast feedback, PRODUCT-04) ─────────────────────────────────
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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
// [storeSlug]/layout.tsx is a Server Component since Slice 7 (REQ-RENDER-02)
// — it's no longer part of this file's client-mounted route tests. See
// storeLayoutServer.test.tsx for its coverage.
import StorefrontHomePage from '@/app/[storeSlug]/page';
import CatalogPage from '@/app/[storeSlug]/catalogo/page';
import ProductPage from '@/app/[storeSlug]/producto/[id]/page';
import { useProduct, useCart, StockError } from '@goshopping/storefront-sdk';
import { toast } from 'sonner';

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

  // Quick-add wiring: ProductCard's "agregar" action goes through the same
  // useCart the rest of the storefront reads (item 5 of Slice 5's scope).
  it('wires the ProductCard quick-add button through useCart', () => {
    const addItem = jest.fn();
    (useCart as jest.Mock).mockReturnValueOnce({
      cart: { items: [] },
      addItem,
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
    });
    render(<CatalogPage />);

    const addButtons = screen.getAllByRole('button', { name: /agregar al carrito/i });
    fireEvent.click(addButtons[0]);

    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 1);
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

  // PRODUCT-01..04: quantity selector, stock cap, out-of-stock state, feedback.
  //
  // NOTE: uses mockReturnValue (persistent), not mockReturnValueOnce — the
  // quantity selector's onClick triggers a React state update, which
  // re-renders ProductPage and calls useProduct/useCart again. A "once"
  // override would only apply to the first render and silently fall back to
  // the file's default mock on the second, making the stock cap/addItem
  // reference drift mid-test.
  describe('cart wiring (PRODUCT-01..04)', () => {
    const DEFAULT_PRODUCT_RESULT = {
      product: {
        id: 'product-123',
        name: 'Camisa Azul',
        price: 89000,
        description: 'Una camisa hermosa',
        images: [{ url: '/img/camisa.jpg' }],
        stock: 5,
      },
      loading: false,
      error: null,
    };
    const DEFAULT_CART_RESULT = {
      cart: { items: [] },
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
    };

    afterEach(() => {
      jest.clearAllMocks();
      (useProduct as jest.Mock).mockReturnValue(DEFAULT_PRODUCT_RESULT);
      (useCart as jest.Mock).mockReturnValue(DEFAULT_CART_RESULT);
    });

    it('adds the selected quantity to the cart', () => {
      const addItem = jest.fn();
      (useCart as jest.Mock).mockReturnValue({
        cart: { items: [] },
        addItem,
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      });
      render(<ProductPage />);

      fireEvent.click(screen.getByRole('button', { name: /aumentar cantidad/i }));
      fireEvent.click(screen.getByRole('button', { name: /aumentar cantidad/i }));
      fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }));

      expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'product-123' }), 3);
    });

    it('caps the quantity selector at the product stock (PRODUCT-02)', () => {
      (useProduct as jest.Mock).mockReturnValue({
        product: { id: 'product-123', name: 'Camisa Azul', price: 89000, description: '', images: [], stock: 2 },
        loading: false,
        error: null,
      });
      render(<ProductPage />);

      const increment = screen.getByRole('button', { name: /aumentar cantidad/i });
      fireEvent.click(increment); // 1 -> 2 (stock cap)
      fireEvent.click(increment); // blocked, still 2
      expect(increment).toBeDisabled();
      expect(screen.getByText(/stock máximo/i)).toBeInTheDocument();
    });

    it('shows a disabled "Sin stock" state when stock is 0 (PRODUCT-03)', () => {
      (useProduct as jest.Mock).mockReturnValue({
        product: { id: 'product-123', name: 'Camisa Azul', price: 89000, description: '', images: [], stock: 0 },
        loading: false,
        error: null,
      });
      render(<ProductPage />);

      const button = screen.getByRole('button', { name: /sin stock/i });
      expect(button).toBeDisabled();
      expect(screen.queryByRole('button', { name: /aumentar cantidad/i })).not.toBeInTheDocument();
    });

    it('shows a success toast with a "Ver carrito" action after adding (PRODUCT-04)', () => {
      render(<ProductPage />);
      fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }));

      expect(toast.success).toHaveBeenCalledWith(
        'Camisa Azul agregado al carrito',
        expect.objectContaining({ action: expect.objectContaining({ label: 'Ver carrito' }) }),
      );
    });

    it('shows a readable stock error toast when addItem throws StockError (PRODUCT-04)', () => {
      (useCart as jest.Mock).mockReturnValue({
        cart: { items: [] },
        addItem: jest.fn(() => {
          throw new StockError('product-123', 1, 3);
        }),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      });
      render(<ProductPage />);

      fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }));

      expect(toast.error).toHaveBeenCalledWith('Solo quedan 1 unidades disponibles');
    });
  });
});
