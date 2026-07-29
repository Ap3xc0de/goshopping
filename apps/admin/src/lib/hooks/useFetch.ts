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

  // Store fetcher in a ref — prevents inline lambdas from causing infinite re-renders
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
