import { toCartItemProps } from '@/lib/cart-adapter';
import { PRODUCT_IMAGE_PLACEHOLDER } from '@/lib/product-image';
import type { CartItem, Product } from '@goshopping/storefront-sdk';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Camiseta',
    sku: 'SKU-1',
    description: '',
    price: 50000,
    stock: 8,
    category: 'ropa',
    images: ['/img/a.jpg'],
    status: 'active',
    ...overrides,
  };
}

describe('toCartItemProps (design decision 12)', () => {
  it('maps a real SDK CartItem {product, quantity} to the flat CartItemData shape', () => {
    const item: CartItem = { product: makeProduct(), quantity: 3 };
    expect(toCartItemProps(item)).toEqual({
      id: 'p1',
      name: 'Camiseta',
      image: '/img/a.jpg',
      price: 50000,
      quantity: 3,
      stock: 8,
    });
  });

  it('falls back to the shared placeholder image when the product has no images', () => {
    const item: CartItem = { product: makeProduct({ images: [] }), quantity: 1 };
    expect(toCartItemProps(item).image).toBe(PRODUCT_IMAGE_PLACEHOLDER);
  });

  it('carries a different product/quantity through untouched (triangulation)', () => {
    const item: CartItem = {
      product: makeProduct({ id: 'p2', name: 'Pantalón', price: 120000, stock: 1 }),
      quantity: 1,
    };
    expect(toCartItemProps(item)).toMatchObject({ id: 'p2', name: 'Pantalón', price: 120000, stock: 1 });
  });
});
