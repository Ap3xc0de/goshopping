import { useFetch } from './useFetch';
import { api } from '../api';
import { useStore } from './useStore';
import type { DashboardMetrics } from '../types';

export function useDashboard() {
  const { storeId } = useStore();
  return useFetch<DashboardMetrics>(
    storeId ? () => api.getDashboard(storeId) : null,
  );
}
