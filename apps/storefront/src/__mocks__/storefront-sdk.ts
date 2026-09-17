/**
 * Manual mock for @goshopping/storefront-sdk
 * Provides default jest.fn() implementations that tests can override with mockReturnValue.
 */

// Error classes are plain, side-effect-free classes (no React) — re-exported
// from the real module via the "./errors" subpath so tests can do
// `new StockError(...)` / `instanceof StockError` without needing to also
// mock production code paths that only throw/catch these.
export { StockError, NetworkError, NotFoundError, ValidationError, GoShoppingError } from '@goshopping/storefront-sdk/errors';

export const useStoreConfig = jest.fn(() => ({
  config: null,
  loading: false,
  error: null,
}));

export const useProducts = jest.fn(() => ({
  products: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 1,
  setPage: jest.fn(),
  setCategory: jest.fn(),
  setSearch: jest.fn(),
  setSort: jest.fn(),
  refresh: jest.fn(),
}));

export const useProduct = jest.fn(() => ({
  product: null,
  loading: false,
  error: null,
}));

export const useCart = jest.fn(() => ({
  cart: { items: [], subtotal: 0, tax: 0, total: 0, itemCount: 0 },
  itemCount: 0,
  isEmpty: true,
  subtotal: 0,
  tax: 0,
  total: 0,
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
}));

export const useOrderStatus = jest.fn(() => ({
  status: null,
  loading: false,
  error: null,
  refresh: jest.fn(),
}));

// CHECKOUT-03: checkout/page.tsx calls `useGoShopping(storeSlug).createOrder(...)`
// directly (there's no dedicated `useCreateOrder` hook) — tests override
// `createOrder`/`getOrderStatus` per-case via `mockReturnValue`.
export const useGoShopping = jest.fn(() => ({
  createOrder: jest.fn(),
  getOrderStatus: jest.fn(),
  getProducts: jest.fn(),
  getProduct: jest.fn(),
  getCategories: jest.fn(),
  getStoreConfig: jest.fn(),
}));
