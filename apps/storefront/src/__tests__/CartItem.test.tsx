/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartItem } from '@/components/cart/CartItem';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} />
  ),
}));

const BASE_PROPS = {
  id: 'p1',
  name: 'Camiseta Premium',
  image: '/img/p1.jpg',
  price: 89000,
  quantity: 2,
  onQuantityChange: jest.fn(),
  onRemove: jest.fn(),
};

describe('CartItem', () => {
  it('renders name, image and line total', () => {
    render(<CartItem {...BASE_PROPS} />);
    expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
    expect(screen.getByAltText('Camiseta Premium')).toBeInTheDocument();
    // 89000 * 2 = 178000
    expect(screen.getByText(/178\.000|178,000/)).toBeInTheDocument();
  });

  it('calls onQuantityChange with quantity+1 when "+" is clicked', () => {
    const onQuantityChange = jest.fn();
    render(<CartItem {...BASE_PROPS} onQuantityChange={onQuantityChange} />);
    fireEvent.click(screen.getByRole('button', { name: /aumentar cantidad/i }));
    expect(onQuantityChange).toHaveBeenCalledWith('p1', 3);
  });

  it('calls onQuantityChange with quantity-1 when "-" is clicked', () => {
    const onQuantityChange = jest.fn();
    render(<CartItem {...BASE_PROPS} onQuantityChange={onQuantityChange} />);
    fireEvent.click(screen.getByRole('button', { name: /disminuir cantidad/i }));
    expect(onQuantityChange).toHaveBeenCalledWith('p1', 1);
  });

  it('disables "-" at quantity 1 (min 1)', () => {
    render(<CartItem {...BASE_PROPS} quantity={1} />);
    expect(screen.getByRole('button', { name: /disminuir cantidad/i })).toBeDisabled();
  });

  it('calls onRemove via the trash icon', () => {
    const onRemove = jest.fn();
    render(<CartItem {...BASE_PROPS} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    expect(onRemove).toHaveBeenCalledWith('p1');
  });

  // CART-03: quantity stepper capped by product.stock
  describe('stock cap (CART-03)', () => {
    it('disables "+" when quantity reaches stock', () => {
      render(<CartItem {...BASE_PROPS} quantity={3} stock={3} />);
      expect(screen.getByRole('button', { name: /aumentar cantidad/i })).toBeDisabled();
    });

    it('shows "stock máximo" feedback when quantity reaches stock', () => {
      render(<CartItem {...BASE_PROPS} quantity={3} stock={3} />);
      expect(screen.getByText(/stock máximo/i)).toBeInTheDocument();
    });

    it('keeps "+" enabled when quantity is below stock', () => {
      render(<CartItem {...BASE_PROPS} quantity={2} stock={5} />);
      expect(screen.getByRole('button', { name: /aumentar cantidad/i })).not.toBeDisabled();
      expect(screen.queryByText(/stock máximo/i)).not.toBeInTheDocument();
    });

    it('does not cap "+" when stock is not provided (undefined)', () => {
      render(<CartItem {...BASE_PROPS} quantity={99} />);
      expect(screen.getByRole('button', { name: /aumentar cantidad/i })).not.toBeDisabled();
    });
  });
});
