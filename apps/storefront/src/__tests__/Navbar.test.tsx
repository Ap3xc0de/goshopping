/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Navbar } from '@/components/layout/Navbar';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

const BASE_PROPS = {
  logo: { text: 'MiTienda', href: '/' },
  links: [
    { label: 'Tienda', href: '/tienda' },
    { label: 'Categorías', href: '/categorias' },
  ],
};

describe('Navbar', () => {
  it('renders logo text', () => {
    render(<Navbar {...BASE_PROPS} />);
    expect(screen.getByText('MiTienda')).toBeInTheDocument();
  });

  it('renders nav links', () => {
    render(<Navbar {...BASE_PROPS} />);
    expect(screen.getByText('Tienda')).toBeInTheDocument();
    expect(screen.getByText('Categorías')).toBeInTheDocument();
  });

  it('renders cart icon', () => {
    render(<Navbar {...BASE_PROPS} cartCount={0} />);
    const cartButton = screen.getByRole('button', { name: /carrito/i });
    expect(cartButton).toBeInTheDocument();
  });

  it('shows cart count badge when items exist', () => {
    render(<Navbar {...BASE_PROPS} cartCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onCartClick when cart button is clicked', () => {
    const onCartClick = jest.fn();
    render(<Navbar {...BASE_PROPS} cartCount={2} onCartClick={onCartClick} />);
    fireEvent.click(screen.getByRole('button', { name: /carrito/i }));
    expect(onCartClick).toHaveBeenCalled();
  });

  it('renders mobile hamburger menu button', () => {
    render(<Navbar {...BASE_PROPS} />);
    const menuButton = screen.getByRole('button', { name: /menú/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('renders with solid variant by default', () => {
    const { container } = render(<Navbar {...BASE_PROPS} variant="solid" />);
    // Navbar should render as a nav element or header
    expect(container.querySelector('nav, header')).toBeTruthy();
  });

  it('renders sticky navbar', () => {
    const { container } = render(<Navbar {...BASE_PROPS} />);
    const nav = container.querySelector('[class*="sticky"], [class*="fixed"]');
    expect(nav).toBeTruthy();
  });
});
