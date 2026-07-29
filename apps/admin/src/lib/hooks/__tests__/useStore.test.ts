import { renderHook } from '@testing-library/react';
import { useStore } from '../useStore';
import { useAuth } from '../useAuth';

jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Helper: build a minimal JWT with stores
function makeToken(stores: Array<{ store_id: string; store_name: string }>) {
  const payload = { stores, sub: 'user-1', exp: 9999999999 };
  const b64 = btoa(JSON.stringify(payload));
  return `header.${b64}.sig`;
}

describe('useStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns nulls when not authenticated', () => {
    mockUseAuth.mockReturnValue({ account: null, loading: false, login: jest.fn(), logout: jest.fn(), register: jest.fn() });
    const { result } = renderHook(() => useStore());
    expect(result.current.storeId).toBeNull();
    expect(result.current.storeName).toBeNull();
    expect(result.current.stores).toEqual([]);
  });

  it('decodes storeId from JWT when token is present', () => {
    const token = makeToken([{ store_id: 'store-jwt', store_name: 'Mi Tienda JWT' }]);
    localStorage.setItem('access_token', token);
    mockUseAuth.mockReturnValue({
      account: { id: 'u1', name: 'User', email: 'u@e.com', role: 'owner', status: 'active', stores: [], created_at: '', updated_at: '' },
      loading: false, login: jest.fn(), logout: jest.fn(), register: jest.fn(),
    });
    const { result } = renderHook(() => useStore());
    expect(result.current.storeId).toBe('store-jwt');
    expect(result.current.storeName).toBe('Mi Tienda JWT');
  });

  it('falls back to account.stores when no JWT', () => {
    mockUseAuth.mockReturnValue({
      account: {
        id: 'u1', name: 'User', email: 'u@e.com', role: 'owner', status: 'active',
        stores: [{ store_id: 'store-fallback', store_name: 'Tienda Fallback', role: 'owner' }],
        created_at: '', updated_at: '',
      },
      loading: false, login: jest.fn(), logout: jest.fn(), register: jest.fn(),
    });
    const { result } = renderHook(() => useStore());
    expect(result.current.storeId).toBe('store-fallback');
    expect(result.current.storeName).toBe('Tienda Fallback');
  });
});
