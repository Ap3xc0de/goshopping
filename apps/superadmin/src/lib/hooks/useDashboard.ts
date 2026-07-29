'use client';

import { api } from '../api';
import { useFetch } from './useFetch';
import type { DashboardMetrics } from '../types';

export function useDashboard() {
  const { data, loading, error, refetch } = useFetch<DashboardMetrics>(
    () => api.getDashboard(),
  );
  return { metrics: data, loading, error, refetch };
}
