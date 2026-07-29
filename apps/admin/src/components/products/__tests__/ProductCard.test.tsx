import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import type { Product } from '@/lib/types';

jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const BASE_PRODUCT: Product = {
  id: 'prod-1',
  store_id: 'store-1',
  name: 'Camiseta verde',
  sku: 'CAM-001',
  price: 45000,
  cost: 20000,
  stock: 15,
  min_stock: 5,
  category: 'Ropa',
  images: [],
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    expect(screen.getByText('Camiseta verde')).toBeInTheDocument();
  });

  it('renders SKU', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    expect(screen.getByText('CAM-001')).toBeInTheDocument();
  });

  it('renders formatted price', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    expect(screen.getByText(/45[\.,]000|45,000/)).toBeInTheDocument();
  });

  it('renders active badge', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('renders inactive badge for inactive product', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, status: 'inactive' }} />);
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('links to the product detail page', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard/products/prod-1');
  });

  it('shows Package icon when no images', () => {
    const { container } = render(<ProductCard product={BASE_PRODUCT} />);
    // SVG icon should be present
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
