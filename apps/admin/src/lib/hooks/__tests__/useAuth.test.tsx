import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../useAuth';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: { login: jest.fn(), register: jest.fn() },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  },
}));

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockApi = api as jest.Mocked<typeof api>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('starts with no account and loading=true then false', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // After hydration, loading becomes false
    await act(async () => {});
    expect(result.current.account).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('login sets account from API response', async () => {
    const mockAccount = { id: 'u1', name: 'Pedro', email: 'p@e.com', role: 'owner' as const, status: 'active', stores: [], created_at: '', updated_at: '' };
    mockApi.login.mockResolvedValueOnce({ access_token: 'tok', refresh_token: 'ref', account: mockAccount });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('p@e.com', 'password');
    });

    expect(result.current.account).toEqual(mockAccount);
  });

  it('login rejects superadmin role', async () => {
    const mockAccount = { id: 'u2', name: 'Admin', email: 'a@e.com', role: 'superadmin' as any, status: 'active', stores: [], created_at: '', updated_at: '' };
    mockApi.login.mockResolvedValueOnce({ access_token: 'tok', refresh_token: 'ref', account: mockAccount });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(
      act(async () => { await result.current.login('a@e.com', 'password'); })
    ).rejects.toThrow();
  });

  it('logout clears account', async () => {
    const mockAccount = { id: 'u1', name: 'Pedro', email: 'p@e.com', role: 'owner' as const, status: 'active', stores: [], created_at: '', updated_at: '' };
    mockApi.login.mockResolvedValueOnce({ access_token: 'tok', refresh_token: 'ref', account: mockAccount });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.login('p@e.com', 'password'); });
    act(() => { result.current.logout(); });
    expect(result.current.account).toBeNull();
  });

  it('hydrates from localStorage on mount', async () => {
    const stored = { id: 'u3', name: 'Stored', email: 's@e.com', role: 'operator' as const, status: 'active', stores: [], created_at: '', updated_at: '' };
    localStorage.setItem('account', JSON.stringify(stored));
    localStorage.setItem('access_token', 'tok');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.account?.id).toBe('u3');
  });
});
