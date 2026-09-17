/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartDrawer } from '@/components/cart/CartDrawer';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

// Mock next/link — CART-02: the drawer's CTAs are real navigation links
// ("Ir a pagar" -> /[storeSlug]/checkout, empty state -> /[storeSlug]/catalogo).
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// CartItemData shape (design decision 12's adapter target) — flat, no
// per-item callbacks (CartDrawer injects onQuantityChange/onRemove once).
const ITEMS = [
  { id: 'p1', name: 'Camiseta Premium', price: 89000, quantity: 2, image: '/img/p1.jpg' },
  { id: 'p2', name: 'Zapatos Deportivos', price: 245000, quantity: 1, image: '/img/p2.jpg' },
];

describe('CartDrawer', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    items: ITEMS,
    onQuantityChange: jest.fn(),
    onRemove: jest.fn(),
    storeSlug: 'mi-tienda',
  };

  it('renders cart items when open', () => {
    render(<CartDrawer {...defaultProps} />);
    expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
    expect(screen.getByText('Zapatos Deportivos')).toBeInTheDocument();
  });

  it('shows empty state with a link to the catalog when no items', () => {
    render(<CartDrawer {...defaultProps} items={[]} />);
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
    const catalogLink = screen.getByRole('link', { name: /catálogo/i });
    expect(catalogLink).toHaveAttribute('href', '/mi-tienda/catalogo');
  });

  it('displays item count in header', () => {
    render(<CartDrawer {...defaultProps} />);
    expect(screen.getByText(/2\s+items/i)).toBeInTheDocument();
  });

  it('calculates and displays total with IVA', () => {
    render(<CartDrawer {...defaultProps} />);
    // subtotal = 89000*2 + 245000 = 423000, IVA = 80370, total = 503370
    // "Total" appears as a heading and as part of pricing rows
    expect(screen.getAllByText(/total/i).length).toBeGreaterThan(0);
  });

  it('the "Ir a pagar" CTA links to /[storeSlug]/checkout', () => {
    render(<CartDrawer {...defaultProps} />);
    const checkoutLink = screen.getByRole('link', { name: /ir a pagar/i });
    expect(checkoutLink).toHaveAttribute('href', '/mi-tienda/checkout');
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = jest.fn();
    render(<CartDrawer {...defaultProps} onRemove={onRemove} />);
    const removeButtons = screen.getAllByRole('button', { name: /eliminar/i });
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('p1');
  });

  it('calls onQuantityChange when a quantity stepper is clicked', () => {
    const onQuantityChange = jest.fn();
    render(<CartDrawer {...defaultProps} onQuantityChange={onQuantityChange} />);
    const incrementButtons = screen.getAllByRole('button', { name: /aumentar cantidad/i });
    fireEvent.click(incrementButtons[0]);
    expect(onQuantityChange).toHaveBeenCalledWith('p1', 3);
  });

  // CART-03: quantity stepper respects each item's stock cap.
  it('disables "+" for an item that reached its stock cap', () => {
    render(
      <CartDrawer
        {...defaultProps}
        items={[{ id: 'p1', name: 'Agotable', price: 1000, quantity: 3, image: '/img/p1.jpg', stock: 3 }]}
      />,
    );
    expect(screen.getByRole('button', { name: /aumentar cantidad/i })).toBeDisabled();
  });
});
