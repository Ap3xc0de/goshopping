import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderStatusActions } from '../OrderStatusActions';
import { useOrderActions } from '@/lib/hooks/useOrders';
import type { Order } from '@/lib/types';

jest.mock('@/lib/hooks/useOrders', () => ({ useOrderActions: jest.fn() }));
jest.mock('@/lib/hooks/useStore', () => ({ useStore: () => ({ storeId: 'store-1', storeName: 'T', stores: [] }) }));
jest.mock('@/lib/hooks/useAuth', () => ({ useAuth: () => ({ account: null, loading: false }) }));

const mockUseOrderActions = useOrderActions as jest.MockedFunction<typeof useOrderActions>;

const makeOrder = (status: Order['status']): Order => ({
  id: 'order-1', store_id: 'store-1', order_number: 'ORD-001',
  customer_id: 'c1', customer_name: 'Juan',
  items: [], subtotal: 50000, tax: 9500, total: 59500,
  status, timeline: [],
  created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
});

describe('OrderStatusActions', () => {
  const mockUpdateStatus = jest.fn().mockResolvedValue(null);
  const mockCancel = jest.fn().mockResolvedValue(null);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrderActions.mockReturnValue({ create: jest.fn(), updateStatus: mockUpdateStatus, cancel: mockCancel, loading: false });
  });

  it('shows advance button for pending order', () => {
    render(<OrderStatusActions order={makeOrder('pending')} storeId="store-1" onUpdated={jest.fn()} />);
    expect(screen.getByText('Confirmar pago')).toBeInTheDocument();
  });

  it('shows cancel button for pending order', () => {
    render(<OrderStatusActions order={makeOrder('pending')} storeId="store-1" onUpdated={jest.fn()} />);
    expect(screen.getByText('Cancelar pedido')).toBeInTheDocument();
  });

  it('hides advance button for delivered order', () => {
    render(<OrderStatusActions order={makeOrder('delivered')} storeId="store-1" onUpdated={jest.fn()} />);
    expect(screen.queryByText(/Confirmar/)).not.toBeInTheDocument();
  });

  it('hides cancel button for delivered order', () => {
    render(<OrderStatusActions order={makeOrder('delivered')} storeId="store-1" onUpdated={jest.fn()} />);
    expect(screen.queryByText('Cancelar pedido')).not.toBeInTheDocument();
  });

  it('clicking advance opens confirm dialog', () => {
    render(<OrderStatusActions order={makeOrder('paid')} storeId="store-1" onUpdated={jest.fn()} />);
    fireEvent.click(screen.getByText('Preparar'));
    expect(screen.getByText(/¿Marcar/i)).toBeInTheDocument();
  });

  it('confirming advance calls updateStatus', async () => {
    const onUpdated = jest.fn();
    render(<OrderStatusActions order={makeOrder('paid')} storeId="store-1" onUpdated={onUpdated} />);
    fireEvent.click(screen.getByText('Preparar'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledWith('store-1', 'order-1', 'preparing'));
    expect(onUpdated).toHaveBeenCalled();
  });
});
