'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoShoppingClient } from './client';
import { CartManager } from './cart';
import type {
  Cart,
  OrderStatus,
  Product,
  ProductParams,
  StoreConfig,
} from './types';

// ── Singleton stores ───────────────────────────────────────────────────────────

const clientCache = new Map<string, GoShoppingClient>();
const cartCache = new Map<string, CartManager>();

// ── useGoShopping ──────────────────────────────────────────────────────────────

export function useGoShopping(storeSlug: string): GoShoppingClient {
  return useMemo(() => {
    if (!clientCache.has(storeSlug)) {
      clientCache.set(storeSlug, new GoShoppingClient({ storeSlug }));
    }
    return clientCache.get(storeSlug)!;
  }, [storeSlug]);
}

// ── useCart ────────────────────────────────────────────────────────────────────

export function useCart(storeSlug: string) {
  const manager = useMemo(() => {
    if (!cartCache.has(storeSlug)) {
      cartCache.set(storeSlug, new CartManager(storeSlug));
    }
    return cartCache.get(storeSlug)!;
  }, [storeSlug]);

  const [cart, setCart] = useState<Cart>(() => manager.getCart());

  useEffect(() => {
    setCart(manager.getCart());
    const unsub = manager.subscribe(setCart);
    return unsub;
  }, [manager]);

  const addItem = useCallback(
    (product: Product, quantity?: number) => manager.addItem(product, quantity),
    [manager],
  );

  const removeItem = useCallback(
    (productId: string) => manager.removeItem(productId),
    [manager],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => manager.updateQuantity(productId, quantity),
    [manager],
  );

  const clearCart = useCallback(() => manager.clearCart(), [manager]);

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount: cart.itemCount,
    isEmpty: cart.itemCount === 0,
    subtotal: cart.subtotal,
    tax: cart.tax,
    total: cart.total,
  };
}

// ── useProducts ────────────────────────────────────────────────────────────────

export function useProducts(storeSlug: string, initialParams?: ProductParams) {
  const client = useGoShopping(storeSlug);

  const [params, setParams] = useState<ProductParams>(initialParams ?? {});
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(initialParams?.page ?? 1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const refreshKey = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.getProducts({ ...params, page });
      setProducts(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client, params, page, refreshKey.current]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
  }, [load]);

  const setPage = useCallback((p: number) => setPageState(p), []);
  const setCategory = useCallback(
    (category: string | null) =>
      setParams((prev) => ({ ...prev, category: category ?? undefined })),
    [],
  );
  const setSearch = useCallback(
    (search: string) => setParams((prev) => ({ ...prev, search })),
    [],
  );
  const setSort = useCallback(
    (sort: string) => setParams((prev) => ({ ...prev, sort: sort as ProductParams['sort'] })),
    [],
  );
  const refresh = useCallback(() => {
    refreshKey.current += 1;
    void load();
  }, [load]);

  return { products, loading, error, total, page, totalPages, setPage, setCategory, setSearch, setSort, refresh };
}

// ── useProduct ─────────────────────────────────────────────────────────────────

export function useProduct(storeSlug: string, productId: string) {
  const client = useGoShopping(storeSlug);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .getProduct(productId)
      .then((p) => { if (!cancelled) setProduct(p); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err : new Error(String(err))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client, productId]);

  return { product, loading, error };
}

// ── useStoreConfig ─────────────────────────────────────────────────────────────

export function useStoreConfig(storeSlug: string) {
  const client = useGoShopping(storeSlug);
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .getStoreConfig()
      .then((c) => { if (!cancelled) setConfig(c); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err : new Error(String(err))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client]);

  return { config, loading, error };
}

// ── useOrderStatus ─────────────────────────────────────────────────────────────

export function useOrderStatus(storeSlug: string, orderId: string, accessToken: string) {
  const client = useGoShopping(storeSlug);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const refreshKey = useRef(0);

  const load = useCallback(async () => {
    if (!orderId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const s = await client.getOrderStatus(orderId, accessToken);
      setStatus(s);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client, orderId, accessToken, refreshKey.current]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(() => {
    refreshKey.current += 1;
    void load();
  }, [load]);

  return { status, loading, error, refresh };
}
