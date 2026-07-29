'use client';

import { useState, useCallback } from 'react';
import { api } from '../api';
import { useFetch } from './useFetch';
import type { Account, AccountFilters, PaginatedResponse } from '../types';

export function useAccounts(initialFilters: AccountFilters = {}) {
  const [filters, setFilters] = useState<AccountFilters>({ page: 1, per_page: 20, ...initialFilters });

  const { data, loading, error, refetch } = useFetch<PaginatedResponse<Account>>(
    () => api.getAccounts(filters),
    [JSON.stringify(filters)],
  );

  const updateFilters = useCallback((next: Partial<AccountFilters>) => {
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  return { data, loading, error, filters, updateFilters, refetch };
}

export function useAccount(id: string | null) {
  const { data, loading, error, refetch } = useFetch<Account>(
    id ? () => api.getAccount(id) : null,
    [id],
  );
  return { account: data, loading, error, refetch };
}
