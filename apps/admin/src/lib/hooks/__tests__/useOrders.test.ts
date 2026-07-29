import { renderHook, waitFor } from '@testing-library/react';
import { useOrders } from '../useOrders';
import { useStore } from '../useStore';
import { api } from '@/lib/api';

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/api', () => ({ api: { getOrders: jest.fn() } }));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;
const mockApi = api as jest.Mocked<typeof api>;

const PAGE_RESULT = { data: [], total: 0, page: 1, per_page: 20, total_pages: 1 };

describe('useOrders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips fetch when storeId is null', () => {
    mockUseStore.mockReturnValue({ storeId: null, storeName: null, stores: [] });
    const { result } = renderHook(() => useOrders());
    expect(result.current.loading).toBe(false);
    expect(mockApi.getOrders).not.toHaveBeenCalled();
  });

  it('fetches orders when storeId is present', async () => {
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'T', stores: [] });
    mockApi.getOrders.mockResolvedValueOnce(PAGE_RESULT);

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(PAGE_RESULT);
  });

  it('passes filters to api.getOrders', async () => {
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'T', stores: [] });
    mockApi.getOrders.mockResolvedValueOnce(PAGE_RESULT);

    const { result } = renderHook(() => useOrders({ status: 'pending', page: 2, per_page: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.getOrders).toHaveBeenCalledWith('store-1', { status: 'pending', page: 2, per_page: 10 });
  });
});
