/**
 * W3 (hardening slice 10): `payment_status` existed on the `Order` type
 * since Slice 1/8 (per design decision 4 — "para tipar la UI, mostrar
 * badge de payment_status") but was never rendered. This covers the order
 * DETAIL page's badge; OrdersTable.test.tsx covers the LIST.
 */
import { render, screen } from '@testing-library/react';
import OrderDetailPage from '../page';
import { useStore } from '@/lib/hooks/useStore';
import { useOrder } from '@/lib/hooks/useOrders';
import type { Order } from '@/lib/types';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/hooks/useOrders', () => ({ useOrder: jest.fn() }));

jest.mock('@/components/orders/OrderStatusActions', () => ({
  OrderStatusActions: () => <div data-testid="status-actions" />,
}));
jest.mock('@/components/orders/OrderTimeline', () => ({
  OrderTimeline: () => <div data-testid="timeline" />,
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;
const mockUseOrder = useOrder as jest.MockedFunction<typeof useOrder>;

const baseOrder: Order = {
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
};

describe('OrderDetailPage', () => {
  beforeEach(() => {
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
  });

  it('renders "Pago pendiente" for a pending payment_status', () => {
    mockUseOrder.mockReturnValue({
      data: { ...baseOrder, payment_status: 'pending' },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<OrderDetailPage params={{ id: 'order-1' }} />);
    expect(screen.getByText('Pago pendiente')).toBeInTheDocument();
  });

  it('renders "Pagado" for a paid payment_status', () => {
    mockUseOrder.mockReturnValue({
      data: { ...baseOrder, status: 'preparing', payment_status: 'paid' },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<OrderDetailPage params={{ id: 'order-1' }} />);
    expect(screen.getByText('Pagado')).toBeInTheDocument();
  });

  it('renders nothing extra when payment_status is absent', () => {
    mockUseOrder.mockReturnValue({
      data: baseOrder,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<OrderDetailPage params={{ id: 'order-1' }} />);
    expect(screen.queryByText('Pago pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Pago fallido')).not.toBeInTheDocument();
    expect(screen.queryByText('Reembolsado')).not.toBeInTheDocument();
  });
});
