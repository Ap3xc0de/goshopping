import { useState, useCallback } from 'react';
import { useFetch } from './useFetch';
import { api } from '../api';
import { useStore } from './useStore';
import type { Order, PaginatedResponse, OrderFilters, OrderStatus } from '../types';

export function useOrders(filters: OrderFilters = {}) {
  const { storeId } = useStore();
  const filterKey = JSON.stringify(filters);

  return useFetch<PaginatedResponse<Order>>(
    storeId ? () => api.getOrders(storeId, filters) : null,
    [storeId, filterKey],
  );
}

export function useOrder(orderId: string | null) {
  const { storeId } = useStore();
  const { data, loading, error, refetch } = useFetch<Order>(
    storeId && orderId ? () => api.getOrder(storeId, orderId) : null,
    [storeId, orderId],
  );
  return { data, loading, error, refetch };
}

export function useOrderActions() {
  const { storeId: internalStoreId } = useStore();
  const [loading, setLoading] = useState(false);

  const create = useCallback(
    async (_storeId: string | null, data: Partial<Order>): Promise<string | null> => {
      const sid = _storeId ?? internalStoreId;
      if (!sid) return 'Sin tienda seleccionada';
      setLoading(true);
      try {
        await api.createOrder(sid, data);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Error al crear pedido';
      } finally {
        setLoading(false);
      }
    },
    [internalStoreId],
  );

  const updateStatus = useCallback(
    async (
      _storeId: string | null,
      orderId: string,
      status: OrderStatus,
      note?: string,
      trackingNumber?: string,
    ): Promise<string | null> => {
      const sid = _storeId ?? internalStoreId;
      if (!sid) return 'Sin tienda seleccionada';
      setLoading(true);
      try {
        await api.updateOrderStatus(sid, orderId, status, note, trackingNumber);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Error al actualizar estado';
      } finally {
        setLoading(false);
      }
    },
    [internalStoreId],
  );

  const cancel = useCallback(
    async (_storeId: string | null, orderId: string, reason: string): Promise<string | null> => {
      const sid = _storeId ?? internalStoreId;
      if (!sid) return 'Sin tienda seleccionada';
      setLoading(true);
      try {
        await api.cancelOrder(sid, orderId, reason);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Error al cancelar pedido';
      } finally {
        setLoading(false);
      }
    },
    [internalStoreId],
  );

  return { create, updateStatus, cancel, loading };
}
