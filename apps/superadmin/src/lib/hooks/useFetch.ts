'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[] = [],
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(0);

  // Keep fetcher in a ref so it never becomes a useCallback dependency.
  // This prevents a new inline lambda from re-triggering the effect on every render.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const execute = useCallback(async () => {
    if (!fetcherRef.current) return;
    const id = ++counterRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (id === counterRef.current) setData(result);
    } catch (err) {
      if (id === counterRef.current) {
        setError(err instanceof Error ? err.message : 'Error inesperado');
      }
    } finally {
      if (id === counterRef.current) setLoading(false);
    }
    // deps drives when to re-fetch; fetcher is intentionally kept as a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
