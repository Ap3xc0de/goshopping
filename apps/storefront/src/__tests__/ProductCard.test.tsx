/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '@/components/product/ProductCard';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} />
  ),
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const BASE_PROPS = {
  id: 'prod-1',
  name: 'Camiseta Premium',
  price: 89000,
  image: '/images/product.jpg',
  imageAlt: 'Camiseta Premium',
};

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard {...BASE_PROPS} />);
    expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
  });

  it('renders formatted COP price', () => {
    render(<ProductCard {...BASE_PROPS} />);
    expect(screen.getByText(/89\.000|89,000/)).toBeInTheDocument();
  });

  it('renders product image with alt text', () => {
    render(<ProductCard {...BASE_PROPS} />);
    expect(screen.getByAltText('Camiseta Premium')).toBeInTheDocument();
  });

  it('renders discount badge when provided', () => {
    render(<ProductCard {...BASE_PROPS} badge="OFERTA" />);
    expect(screen.getByText('OFERTA')).toBeInTheDocument();
  });

  it('does not render badge when not provided', () => {
    render(<ProductCard {...BASE_PROPS} />);
    expect(screen.queryByText('OFERTA')).not.toBeInTheDocument();
  });

  it('renders original price with strikethrough when discount exists', () => {
    render(<ProductCard {...BASE_PROPS} originalPrice={120000} />);
    expect(screen.getByText(/120\.000|120,000/)).toBeInTheDocument();
  });

  it('calls onAddToCart with product id when button clicked', () => {
    const onAddToCart = jest.fn();
    render(<ProductCard {...BASE_PROPS} onAddToCart={onAddToCart} />);
    // The add-to-cart button is an icon button with aria-label
    const addButton = screen.getByRole('button', { name: /agregar al carrito/i });
    fireEvent.click(addButton);
    expect(onAddToCart).toHaveBeenCalledWith('prod-1');
  });

  it('does not call anything when button clicked without onAddToCart handler', () => {
    // Button is always rendered; clicking without handler should not throw
    render(<ProductCard {...BASE_PROPS} />);
    const addButton = screen.getByRole('button', { name: /agregar al carrito/i });
    expect(() => fireEvent.click(addButton)).not.toThrow();
  });

  it('renders rating stars when rating is provided', () => {
    const { container } = render(<ProductCard {...BASE_PROPS} rating={4.5} reviewCount={42} />);
    expect(container.querySelector('[class*="star"], svg')).toBeTruthy();
    expect(screen.getByText('(42)')).toBeInTheDocument();
  });
});
