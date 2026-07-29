import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrdersTable } from '../OrdersTable';
import type { Order } from '@/lib/types';

jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  store_id: 'store-1',
  order_number: 'ORD-001',
  customer_id: 'cust-1',
  customer_name: 'María García',
  items: [],
  subtotal: 50000,
  tax: 9500,
  total: 59500,
  status: 'pending',
  timeline: [],
  created_at: '2024-06-01T10:00:00Z',
  updated_at: '2024-06-01T10:00:00Z',
  ...overrides,
});

describe('OrdersTable', () => {
  it('renders empty state when no orders', () => {
    render(<OrdersTable orders={[]} page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByText('Sin pedidos')).toBeInTheDocument();
  });

  it('renders order number as link', () => {
    render(<OrdersTable orders={[makeOrder()]} page={1} totalPages={1} onPageChange={jest.fn()} />);
    const link = screen.getByRole('link', { name: '#ORD-001' });
    expect(link).toHaveAttribute('href', '/dashboard/orders/order-1');
  });

  it('renders customer name', () => {
    render(<OrdersTable orders={[makeOrder()]} page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByText('María García')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<OrdersTable orders={[makeOrder()]} page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders multiple orders', () => {
    const orders = [
      makeOrder({ id: 'o1', order_number: 'ORD-001' }),
      makeOrder({ id: 'o2', order_number: 'ORD-002', customer_name: 'Carlos López' }),
    ];
    render(<OrdersTable orders={orders} page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByText('#ORD-001')).toBeInTheDocument();
    expect(screen.getByText('Carlos López')).toBeInTheDocument();
  });
});
