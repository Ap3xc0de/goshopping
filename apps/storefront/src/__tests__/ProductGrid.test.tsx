/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductGrid } from '@/components/product/ProductGrid';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
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

const PRODUCTS = [
  { id: '1', name: 'Producto A', price: 50000, image: '/a.jpg' },
  { id: '2', name: 'Producto B', price: 75000, image: '/b.jpg' },
  { id: '3', name: 'Producto C', price: 100000, image: '/c.jpg' },
];

describe('ProductGrid', () => {
  it('renders correct number of product cards', () => {
    render(<ProductGrid products={PRODUCTS} />);
    expect(screen.getByText('Producto A')).toBeInTheDocument();
    expect(screen.getByText('Producto B')).toBeInTheDocument();
    expect(screen.getByText('Producto C')).toBeInTheDocument();
  });

  it('renders empty when products array is empty', () => {
    const { container } = render(<ProductGrid products={[]} />);
    // Should not throw — renders empty grid
    expect(container.querySelector('[class*="grid"]')).toBeTruthy();
  });

  it('renders loading skeleton when loading=true', () => {
    const { container } = render(<ProductGrid products={[]} loading skeletonCount={3} />);
    // Skeleton elements should be present
    const skeletons = container.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('applies correct grid columns class for columns=4', () => {
    const { container } = render(<ProductGrid products={PRODUCTS} columns={4} />);
    const grid = container.querySelector('[class*="grid"]');
    expect(grid?.className).toMatch(/cols-/);
  });

  it('renders all product prices', () => {
    render(<ProductGrid products={PRODUCTS} />);
    expect(screen.getByText(/50\.000|50,000/)).toBeInTheDocument();
    expect(screen.getByText(/75\.000|75,000/)).toBeInTheDocument();
    expect(screen.getByText(/100\.000|100,000/)).toBeInTheDocument();
  });
});
