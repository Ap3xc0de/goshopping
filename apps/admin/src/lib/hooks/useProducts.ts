import { useState, useCallback } from 'react';
import { useFetch } from './useFetch';
import { api } from '../api';
import { useStore } from './useStore';
import type { Product, PaginatedResponse, ProductFilters } from '../types';

export function useProducts(filters: ProductFilters = {}) {
  const { storeId } = useStore();
  const filterKey = JSON.stringify(filters);

  return useFetch<PaginatedResponse<Product>>(
    storeId ? () => api.getProducts(storeId, filters) : null,
    [storeId, filterKey],
  );
}

export function useProduct(productId: string | null) {
  const { storeId } = useStore();
  return useFetch<Product>(
    storeId && productId ? () => api.getProduct(storeId, productId) : null,
    [storeId, productId],
  );
}

export function useProductActions() {
  const { storeId: internalStoreId } = useStore();
  const [loading, setLoading] = useState(false);

  /** Create a product. Returns error string on failure, null on success. */
  const create = useCallback(
    async (_storeId: string | null, data: Partial<Product>): Promise<string | null> => {
      const sid = _storeId ?? internalStoreId;
      if (!sid) return 'Sin tienda seleccionada';
      setLoading(true);
      try {
        await api.createProduct(sid, data);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Error al crear producto';
      } finally {
        setLoading(false);
      }
    },
    [internalStoreId],
  );

  /** Update a product. Returns error string on failure, null on success. */
  const update = useCallback(
    async (_storeId: string | null, productId: string, data: Partial<Product>): Promise<string | null> => {
      const sid = _storeId ?? internalStoreId;
      if (!sid) return 'Sin tienda seleccionada';
      setLoading(true);
      try {
        await api.updateProduct(sid, productId, data);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Error al actualizar producto';
      } finally {
        setLoading(false);
      }
    },
    [internalStoreId],
  );

  /** Delete a product. Returns error string on failure, null on success. */
  const remove = useCallback(
    async (_storeId: string | null, productId: string): Promise<string | null> => {
      const sid = _storeId ?? internalStoreId;
      if (!sid) return 'Sin tienda seleccionada';
      setLoading(true);
      try {
        await api.deleteProduct(sid, productId);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Error al eliminar producto';
      } finally {
        setLoading(false);
      }
    },
    [internalStoreId],
  );

  return { create, update, remove, loading };
}


