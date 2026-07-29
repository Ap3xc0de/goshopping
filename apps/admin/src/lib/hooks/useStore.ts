'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { decodeJWT } from '../utils';
import type { StoreRef } from '../types';

interface StoreContextValue {
  storeId: string | null;
  storeName: string | null;
  stores: StoreRef[];
}

/**
 * Returns the current store context from the JWT payload.
 * MVP: uses the first store in the list.
 */
export function useStore(): StoreContextValue {
  const { account } = useAuth();

  return useMemo(() => {
    if (!account) return { storeId: null, storeName: null, stores: [] };

    const stores = account.stores ?? [];

    // Try to get from JWT for freshest data
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      const payload = decodeJWT(token);
      if (payload && Array.isArray(payload.stores)) {
        const jwtStores = payload.stores as StoreRef[];
        if (jwtStores.length > 0) {
          return {
            storeId: jwtStores[0].store_id,
            storeName: jwtStores[0].store_name ?? account.name,
            stores: jwtStores,
          };
        }
      }
    }

    // Fallback to account.stores
    if (stores.length > 0) {
      return {
        storeId: stores[0].store_id,
        storeName: stores[0].store_name,
        stores,
      };
    }

    return { storeId: null, storeName: null, stores: [] };
  }, [account]);
}
