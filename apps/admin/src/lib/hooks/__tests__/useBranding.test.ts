import { renderHook, waitFor, act } from '@testing-library/react';
import { useBranding } from '../useBranding';
import { useStore } from '../useStore';
import { api, ApiError } from '@/lib/api';
import type { StoreBranding } from '@/lib/types';

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: { getBranding: jest.fn(), updateBranding: jest.fn() },
  };
});

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;
const mockApi = api as jest.Mocked<typeof api>;

const baseBranding: StoreBranding = {
  brand_name: 'Mi Tienda',
  colors: { primary: '0 0% 9%' },
};

describe('useBranding', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips fetch when storeId is null', () => {
    mockUseStore.mockReturnValue({ storeId: null, storeName: null, stores: [] });
    const { result } = renderHook(() => useBranding());
    expect(result.current.loading).toBe(false);
    expect(mockApi.getBranding).not.toHaveBeenCalled();
    expect(result.current.branding).toBeNull();
  });

  it('loads branding for the current store', async () => {
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
    mockApi.getBranding.mockResolvedValueOnce(baseBranding);

    const { result } = renderHook(() => useBranding());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.branding).toEqual(baseBranding);
    expect(mockApi.getBranding).toHaveBeenCalledWith('store-1');
  });

  it('save() calls updateBranding with the given payload and updates branding on success', async () => {
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
    mockApi.getBranding.mockResolvedValueOnce(baseBranding);
    const updated: StoreBranding = { ...baseBranding, colors: { primary: '10 80% 40%' } };
    mockApi.updateBranding.mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useBranding());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.save({ colors: { primary: '10 80% 40%' } });
    });

    expect(mockApi.updateBranding).toHaveBeenCalledWith('store-1', {
      colors: { primary: '10 80% 40%' },
    });
    expect(ok).toBe(true);
    expect(result.current.branding).toEqual(updated);
    expect(result.current.saveError).toBeNull();
  });

  it('surfaces a server validation error from save() without touching the previously loaded branding', async () => {
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
    mockApi.getBranding.mockResolvedValueOnce(baseBranding);
    mockApi.updateBranding.mockRejectedValueOnce(
      new ApiError(400, 'validation_error', 'colors.nav_background: must match format "H S% L%"'),
    );

    const { result } = renderHook(() => useBranding());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.save({ colors: { nav_background: '#fff' } });
    });

    expect(ok).toBe(false);
    expect(result.current.saveError).toContain('H S% L%');
    expect(result.current.branding).toEqual(baseBranding);
  });

  it('reload() clears any saved override and refetches from the server', async () => {
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
    mockApi.getBranding.mockResolvedValueOnce(baseBranding);
    const updated: StoreBranding = { ...baseBranding, brand_name: 'Nuevo nombre' };
    mockApi.updateBranding.mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useBranding());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({ brand_name: 'Nuevo nombre' });
    });
    expect(result.current.branding).toEqual(updated);

    mockApi.getBranding.mockResolvedValueOnce(baseBranding);
    act(() => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.branding).toEqual(baseBranding));
    expect(mockApi.getBranding).toHaveBeenCalledTimes(2);
  });
});
