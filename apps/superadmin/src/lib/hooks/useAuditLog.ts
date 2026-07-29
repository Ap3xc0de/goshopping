'use client';

import { useState, useCallback } from 'react';
import { api } from '../api';
import { useFetch } from './useFetch';
import type { AuditLogEntry, AuditLogFilters, PaginatedResponse } from '../types';

export function useAuditLog(initialFilters: AuditLogFilters = {}) {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, per_page: 30, ...initialFilters });

  const { data, loading, error, refetch } = useFetch<PaginatedResponse<AuditLogEntry>>(
    () => api.getAuditLog(filters),
    [JSON.stringify(filters)],
  );

  const updateFilters = useCallback((next: Partial<AuditLogFilters>) => {
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  return { data, loading, error, filters, updateFilters, refetch };
}
