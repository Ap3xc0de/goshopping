import type { Cart, CartItem, Product } from './types';
import { StockError } from './errors';

export class CartManager {
  private storageKey: string;
  private taxRate: number;
  private listeners: Set<(cart: Cart) => void>;

  constructor(storeSlug: string, taxRate: number = 0.19) {
    this.storageKey = `goshopping_cart_${storeSlug}`;
    this.taxRate = taxRate;
    this.listeners = new Set();
  }

  // ── Operaciones ────────────────────────────────────────────────────────────

  addItem(product: Product, quantity: number = 1): Cart {
    if (quantity <= 0) {
      throw new RangeError('quantity debe ser mayor a 0');
    }

    const items = this.readItems();
    const existing = items.find((i) => i.product.id === product.id);
    const newTotal = (existing?.quantity ?? 0) + quantity;

    if (newTotal > product.stock) {
      throw new StockError(product.id, product.stock, newTotal);
    }

    if (existing) {
      existing.quantity = newTotal;
    } else {
      items.push({ product, quantity });
    }

    return this.saveAndNotify(items);
  }

  removeItem(productId: string): Cart {
    const items = this.readItems().filter((i) => i.product.id !== productId);
    return this.saveAndNotify(items);
  }

  updateQuantity(productId: string, quantity: number): Cart {
    if (quantity <= 0) {
      return this.removeItem(productId);
    }

    const items = this.readItems();
    const item = items.find((i) => i.product.id === productId);
    if (item) {
      if (quantity > item.product.stock) {
        throw new StockError(item.product.id, item.product.stock, quantity);
      }
      item.quantity = quantity;
    }
    return this.saveAndNotify(items);
  }

  clearCart(): Cart {
    return this.saveAndNotify([]);
  }

  getCart(): Cart {
    const items = this.readItems();
    const totals = this.calculateTotals(items);
    return {
      items,
      ...totals,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  // ── Cálculos ───────────────────────────────────────────────────────────────

  private calculateTotals(items: CartItem[]): { subtotal: number; tax: number; total: number } {
    const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const tax = Math.round(subtotal * this.taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { subtotal, tax, total };
  }

  // ── Suscripción ────────────────────────────────────────────────────────────

  subscribe(listener: (cart: Cart) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  get itemCount(): number {
    return this.readItems().reduce((sum, i) => sum + i.quantity, 0);
  }

  get isEmpty(): boolean {
    return this.readItems().length === 0;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private readItems(): CartItem[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  }

  private saveAndNotify(items: CartItem[]): Cart {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(items));
      }
    } catch {
      // localStorage no disponible (SSR, incógnito lleno, etc.) — continuar sin persistir
    }

    const totals = this.calculateTotals(items);
    const cart: Cart = {
      items,
      ...totals,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    };

    this.listeners.forEach((fn) => fn(cart));
    return cart;
  }
}
