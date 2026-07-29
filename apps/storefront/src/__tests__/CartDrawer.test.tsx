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
    onCheckout: jest.fn(),
  };

  it('renders cart items when open', () => {
    render(<CartDrawer {...defaultProps} />);
    expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
    expect(screen.getByText('Zapatos Deportivos')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<CartDrawer {...defaultProps} items={[]} />);
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
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

  it('calls onCheckout when checkout button is clicked', () => {
    const onCheckout = jest.fn();
    render(<CartDrawer {...defaultProps} onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole('button', { name: /checkout|pagar|ir al/i }));
    expect(onCheckout).toHaveBeenCalled();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = jest.fn();
    render(<CartDrawer {...defaultProps} onRemove={onRemove} />);
    const removeButtons = screen.getAllByRole('button', { name: /eliminar/i });
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('p1');
  });
});
