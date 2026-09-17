/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useCart } from '@goshopping/storefront-sdk';
import { StorefrontChrome } from '@/components/layout/StorefrontChrome';
import { openCartDrawer } from '@/lib/cart-drawer-events';

const mockUsePathname = jest.fn(() => '/tienda-a');
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

const BASE_PROPS = {
  storeSlug: 'tienda-a',
  navbarVariant: 'solid' as const,
  footerVariant: 'minimal' as const,
  logo: { text: 'Mi Tienda', href: '/tienda-a' },
  navLinks: [{ label: 'Catálogo', href: '/tienda-a/catalogo' }],
  storeName: 'Mi Tienda',
};

interface FakeItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
}

function cartWith(items: FakeItem[]) {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return {
    cart: {
      items: items.map((i) => ({
        product: {
          id: i.id,
          name: i.name,
          price: i.price,
          stock: i.stock ?? 99,
          sku: 'sku',
          description: '',
          category: '',
          images: [],
          status: 'active' as const,
        },
        quantity: i.quantity,
      })),
      subtotal: 0,
      tax: 0,
      total: 0,
      itemCount,
    },
    itemCount,
    isEmpty: items.length === 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
  };
}

describe('StorefrontChrome (CART-01,02,05,06)', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/tienda-a');
    (useCart as jest.Mock).mockReset();
  });

  it('shows the real itemCount as the navbar cart badge', () => {
    (useCart as jest.Mock).mockReturnValue(
      cartWith([{ id: 'p1', name: 'Camiseta', price: 50000, quantity: 3 }]),
    );
    render(
      <StorefrontChrome {...BASE_PROPS}>
        <div>contenido</div>
      </StorefrontChrome>,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides the badge when the real cart is empty', () => {
    (useCart as jest.Mock).mockReturnValue(cartWith([]));
    render(
      <StorefrontChrome {...BASE_PROPS}>
        <div>contenido</div>
      </StorefrontChrome>,
    );
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens the drawer with real item data when the cart icon is clicked', () => {
    (useCart as jest.Mock).mockReturnValue(
      cartWith([{ id: 'p1', name: 'Camiseta Real', price: 50000, quantity: 2 }]),
    );
    render(
      <StorefrontChrome {...BASE_PROPS}>
        <div>contenido</div>
      </StorefrontChrome>,
    );
    expect(screen.queryByText('Camiseta Real')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /carrito/i }));
    expect(screen.getByText('Camiseta Real')).toBeInTheDocument();
  });

  it('renders the passed children', () => {
    (useCart as jest.Mock).mockReturnValue(cartWith([]));
    render(
      <StorefrontChrome {...BASE_PROPS}>
        <div data-testid="page-content">Hola</div>
      </StorefrontChrome>,
    );
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('closes the drawer when the route changes', () => {
    (useCart as jest.Mock).mockReturnValue(
      cartWith([{ id: 'p1', name: 'Item', price: 1000, quantity: 1 }]),
    );
    const { rerender } = render(
      <StorefrontChrome {...BASE_PROPS}>
        <div>contenido</div>
      </StorefrontChrome>,
    );
    fireEvent.click(screen.getByRole('button', { name: /carrito/i }));
    expect(screen.getByText('Item')).toBeInTheDocument();

    mockUsePathname.mockReturnValue('/tienda-a/checkout');
    rerender(
      <StorefrontChrome {...BASE_PROPS}>
        <div>contenido</div>
      </StorefrontChrome>,
    );
    expect(screen.queryByText('Item')).not.toBeInTheDocument();
  });

  it('opens the drawer when the "Ver carrito" cart-drawer:open event fires (PRODUCT-04)', () => {
    (useCart as jest.Mock).mockReturnValue(
      cartWith([{ id: 'p1', name: 'Item Evento', price: 1000, quantity: 1 }]),
    );
    render(
      <StorefrontChrome {...BASE_PROPS}>
        <div>contenido</div>
      </StorefrontChrome>,
    );
    expect(screen.queryByText('Item Evento')).not.toBeInTheDocument();
    act(() => {
      openCartDrawer();
    });
    expect(screen.getByText('Item Evento')).toBeInTheDocument();
  });
});
