import { renderHook, waitFor } from '@testing-library/react';
import { useDashboard } from '../useDashboard';
import { useStore } from '../useStore';
import { api } from '@/lib/api';

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/api', () => ({ api: { getDashboard: jest.fn() } }));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;
const mockApi = api as jest.Mocked<typeof api>;

describe('useDashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips fetch when storeId is null', () => {
    mockUseStore.mockReturnValue({ storeId: null, storeName: null, stores: [] });
    const { result } = renderHook(() => useDashboard());
    expect(result.current.loading).toBe(false);
    expect(mockApi.getDashboard).not.toHaveBeenCalled();
  });

  it('fetches dashboard data when storeId is present', async () => {
    const mockMetrics = {
      sales_today: 100000,
      sales_month: 2000000,
      sales_prev_month: 1800000,
      pending_orders: 3,
      low_stock_count: 1,
      recent_orders: [],
      low_stock_products: [],
      sales_by_day: [],
    };
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
    mockApi.getDashboard.mockResolvedValueOnce(mockMetrics);

    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockMetrics);
  });
});
