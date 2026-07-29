/**
 * Manual mock for @goshopping/storefront-sdk
 * Provides default jest.fn() implementations that tests can override with mockReturnValue.
 */

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
  cart: { items: [], total: 0 },
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
}));

export const useOrderStatus = jest.fn(() => ({
  order: null,
  loading: false,
  error: null,
}));
