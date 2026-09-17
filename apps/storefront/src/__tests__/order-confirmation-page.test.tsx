/**
 * @jest-environment jsdom
 *
 * CHECKOUT-06: order confirmation page at /[storeSlug]/pedido/[orderId].
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockGetSearchParam = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ storeSlug: 'tienda-test', orderId: 'order-123' }),
  useSearchParams: () => ({ get: mockGetSearchParam }),
}));

jest.mock('@goshopping/storefront-sdk', () => ({
  ...jest.requireActual('@goshopping/storefront-sdk'),
  useOrderStatus: jest.fn(),
}));

import { useOrderStatus, GoShoppingError } from '@goshopping/storefront-sdk';
import OrderConfirmationPage from '@/app/[storeSlug]/pedido/[orderId]/page';

describe('[storeSlug]/pedido/[orderId] OrderConfirmationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSearchParam.mockReturnValue('tok-abc');
  });

  it('CHECKOUT-06: renders order number, order status and payment status from getOrderStatus', () => {
    (useOrderStatus as jest.Mock).mockReturnValue({
      status: {
        id: 'order-123',
        order_number: 'ORD-001',
        status: 'pending',
        payment_status: 'pending',
        total: 100000,
        items: [
          { product_id: 'prod-a', product_name: 'Camiseta', quantity: 2, unit_price: 50000, total: 100000 },
        ],
        shipping_address: {
          street: 'Calle 123',
          city: 'Bogotá',
          state: 'Cundinamarca',
          zip: '110111',
        },
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderConfirmationPage />);

    expect(screen.getByText(/ORD-001/)).toBeInTheDocument();
    expect(screen.getByText(/estado del pedido: pendiente/i)).toBeInTheDocument();
    expect(screen.getByText(/estado del pago: pago pendiente/i)).toBeInTheDocument();
    expect(screen.getByText(/Camiseta/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /seguir comprando/i })).toHaveAttribute(
      'href',
      '/tienda-test/catalogo',
    );
  });

  it('CHECKOUT-06: shows a friendly message when the token is missing', () => {
    mockGetSearchParam.mockReturnValue(null);
    (useOrderStatus as jest.Mock).mockReturnValue({ status: null, loading: false, error: null, refresh: jest.fn() });

    render(<OrderConfirmationPage />);

    expect(screen.getByRole('heading', { name: /no pudimos encontrar tu pedido/i })).toBeInTheDocument();
  });

  it('CHECKOUT-06: shows a friendly message on 401 (invalid token)', () => {
    (useOrderStatus as jest.Mock).mockReturnValue({
      status: null,
      loading: false,
      error: new GoShoppingError(401, 'token required', 'UNAUTHORIZED'),
      refresh: jest.fn(),
    });

    render(<OrderConfirmationPage />);

    expect(screen.getByRole('heading', { name: /no pudimos encontrar tu pedido/i })).toBeInTheDocument();
  });
});
