import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CustomersTable } from '../CustomersTable';
import type { Customer } from '@/lib/types';

jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const makeCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'cust-1',
  store_id: 'store-1',
  name: 'Ana Martínez',
  email: 'ana@example.com',
  orders_count: 5,
  total_spent: 250000,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('CustomersTable', () => {
  it('renders empty state when no customers', () => {
    render(<CustomersTable customers={[]} page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByText('Sin clientes')).toBeInTheDocument();
  });

  it('renders customer name as link', () => {
    render(<CustomersTable customers={[makeCustomer()]} page={1} totalPages={1} onPageChange={jest.fn()} />);
    const link = screen.getByRole('link', { name: 'Ana Martínez' });
    expect(link).toHaveAttribute('href', '/dashboard/customers/cust-1');
  });

  it('renders customer email', () => {
    render(<CustomersTable customers={[makeCustomer()]} page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('renders orders count', () => {
    render(<CustomersTable customers={[makeCustomer()]} page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders multiple customers', () => {
    const customers = [
      makeCustomer({ id: 'c1', name: 'Ana Martínez' }),
      makeCustomer({ id: 'c2', name: 'Luis Torres', email: 'luis@example.com' }),
    ];
    render(<CustomersTable customers={customers} page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByText('Ana Martínez')).toBeInTheDocument();
    expect(screen.getByText('Luis Torres')).toBeInTheDocument();
  });
});
