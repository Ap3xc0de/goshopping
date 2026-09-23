'use client';

import { useSyncExternalStore } from 'react';

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  effective_price: number;
  image?: string;
  qty: number;
  variant?: string;
}

// Mirrors the GOSHOPPING_STORE_SLUG default. localStorage is not available
// during SSR, so all reads happen inside subscribe()/mutations on the client.
const STORE_SLUG = 'thebitequestrian';
const KEY = `tbe_cart_${STORE_SLUG}`;

let items: CartItem[] = [];
let initialized = false;
const listeners = new Set<() => void>();

const EMPTY: CartItem[] = [];

function load(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as CartItem[];
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    items = [];
  }
}

function persist(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Ignore quota / serialization errors; cart stays in memory only.
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function snapshot(): CartItem[] {
  return items;
}

function serverSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  if (!initialized) {
    load();
    initialized = true;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function sameItem(a: CartItem, productId: string, variant: string | undefined): boolean {
  return a.productId === productId && a.variant === variant;
}

export function addItem(item: Omit<CartItem, 'qty'> & { qty?: number }): void {
  if (!initialized) {
    load();
    initialized = true;
  }
  const qty = item.qty ?? 1;
  const existing = items.find((i) => sameItem(i, item.productId, item.variant));
  if (existing) {
    items = items.map((i) =>
      sameItem(i, item.productId, item.variant) ? { ...i, qty: i.qty + qty } : i,
    );
  } else {
    items = [...items, { ...item, qty }];
  }
  persist();
  emit();
}

export function updateQty(
  productId: string,
  variant: string | undefined,
  qty: number,
): void {
  if (!initialized) {
    load();
    initialized = true;
  }
  if (qty <= 0) {
    items = items.filter((i) => !sameItem(i, productId, variant));
  } else {
    items = items.map((i) =>
      sameItem(i, productId, variant) ? { ...i, qty } : i,
    );
  }
  persist();
  emit();
}

export function removeItem(productId: string, variant: string | undefined): void {
  if (!initialized) {
    load();
    initialized = true;
  }
  items = items.filter((i) => !sameItem(i, productId, variant));
  persist();
  emit();
}

export function clear(): void {
  if (!initialized) {
    load();
    initialized = true;
  }
  items = [];
  persist();
  emit();
}

export function useCart(): {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: typeof addItem;
  updateQty: typeof updateQty;
  removeItem: typeof removeItem;
  clear: typeof clear;
} {
  const cartItems = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const count = cartItems.reduce((n, i) => n + i.qty, 0);
  const subtotal = cartItems.reduce((s, i) => s + i.effective_price * i.qty, 0);
  return { items: cartItems, count, subtotal, addItem, updateQty, removeItem, clear };
}
