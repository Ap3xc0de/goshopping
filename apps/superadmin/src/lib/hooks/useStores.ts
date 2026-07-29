'use client';

import { useState, useCallback } from 'react';
import { api } from '../api';
import { useFetch } from './useFetch';
import type { Store, StoreFilters, PaginatedResponse } from '../types';

export function useStores(initialFilters: StoreFilters = {}) {
  const [filters, setFilters] = useState<StoreFilters>({ page: 1, per_page: 20, ...initialFilters });

  const { data, loading, error, refetch } = useFetch<PaginatedResponse<Store>>(
    () => api.getStores(filters),
    [JSON.stringify(filters)],
  );

  const updateFilters = useCallback((next: Partial<StoreFilters>) => {
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  return { data, loading, error, filters, updateFilters, refetch };
}

export function useStore(id: string | null) {
  const { data, loading, error, refetch } = useFetch<Store>(
    id ? () => api.getStore(id) : null,
    [id],
  );
  return { store: data, loading, error, refetch };
}
