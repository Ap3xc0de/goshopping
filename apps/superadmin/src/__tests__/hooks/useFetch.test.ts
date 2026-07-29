import { renderHook, act } from '@testing-library/react';
import { useFetch } from '@/lib/hooks/useFetch';

describe('useFetch', () => {
  it('returns loading=true initially', () => {
    const { result } = renderHook(() =>
      useFetch(() => new Promise(() => {})),
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('sets data on successful fetch', async () => {
    const fetcher = jest.fn().mockResolvedValue({ value: 42 });
    const { result } = renderHook(() => useFetch(fetcher));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBeNull();
  });

  it('sets error on failed fetch', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useFetch(fetcher));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('does nothing when fetcher is null', () => {
    const { result } = renderHook(() => useFetch(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });
});
