import { useState, useCallback } from 'react';
import { useFetch } from './useFetch';
import { api } from '../api';
import { useStore } from './useStore';
import type { Customer, PaginatedResponse, CustomerFilters, Order } from '../types';

export function useCustomers(filters: CustomerFilters = {}) {
  const { storeId } = useStore();
  const filterKey = JSON.stringify(filters);

  return useFetch<PaginatedResponse<Customer>>(
    storeId ? () => api.getCustomers(storeId, filters) : null,
    [storeId, filterKey],
  );
}

export function useCustomer(customerId: string | null) {
  const { storeId } = useStore();
  return useFetch<Customer>(
    storeId && customerId ? () => api.getCustomer(storeId, customerId) : null,
    [storeId, customerId],
  );
}

export function useCustomerOrders(customerId: string | null) {
  const { storeId } = useStore();
  return useFetch<PaginatedResponse<Order>>(
    storeId && customerId ? () => api.getCustomerOrders(storeId, customerId) : null,
    [storeId, customerId],
  );
}

export function useCustomerActions() {
  const { storeId: internalStoreId } = useStore();
  const [loading, setLoading] = useState(false);

  const create = useCallback(
    async (_storeId: string | null, data: Partial<Customer>): Promise<string | null> => {
      const sid = _storeId ?? internalStoreId;
      if (!sid) return 'Sin tienda seleccionada';
      setLoading(true);
      try {
        await api.createCustomer(sid, data);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Error al crear cliente';
      } finally {
        setLoading(false);
      }
    },
    [internalStoreId],
  );

  return { create, loading };
}
