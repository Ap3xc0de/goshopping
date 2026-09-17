import { toast } from 'sonner';
import { StockError } from '@goshopping/storefront-sdk';
import type { Product } from '@goshopping/storefront-sdk';
import { addToCartWithFeedback } from '@/lib/add-to-cart-feedback';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Camiseta',
    sku: 'SKU-1',
    description: '',
    price: 50000,
    stock: 5,
    category: 'ropa',
    images: [],
    status: 'active',
    ...overrides,
  };
}

describe('addToCartWithFeedback (PRODUCT-04)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls addItem with the product and quantity, then shows a success toast with a "Ver carrito" action', () => {
    const addItem = jest.fn();
    const product = makeProduct({ name: 'Camiseta Premium' });

    addToCartWithFeedback(addItem, product, 2);

    expect(addItem).toHaveBeenCalledWith(product, 2);
    expect(toast.success).toHaveBeenCalledWith(
      'Camiseta Premium agregado al carrito',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Ver carrito' }),
      }),
    );
  });

  it('defaults quantity to 1 when not provided', () => {
    const addItem = jest.fn();
    addToCartWithFeedback(addItem, makeProduct());
    expect(addItem).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('shows a readable stock error toast when addItem throws StockError', () => {
    const addItem = jest.fn(() => {
      throw new StockError('p1', 2, 5);
    });

    addToCartWithFeedback(addItem, makeProduct());

    expect(toast.error).toHaveBeenCalledWith('Solo quedan 2 unidades disponibles');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows a generic error toast for non-stock errors, without throwing', () => {
    const addItem = jest.fn(() => {
      throw new Error('network down');
    });

    expect(() => addToCartWithFeedback(addItem, makeProduct())).not.toThrow();
    expect(toast.error).toHaveBeenCalledWith('No se pudo agregar el producto al carrito');
  });
});
