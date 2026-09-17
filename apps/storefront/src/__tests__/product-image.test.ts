import type { Product } from '@goshopping/storefront-sdk';
import { productImage, PRODUCT_IMAGE_PLACEHOLDER, toProductCard } from '@/lib/product-image';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-1',
    store_id: 's-1',
    name: 'Tenis Nike',
    sku: 'SKU-1',
    description: '',
    price: 250000,
    stock: 5,
    category: 'Calzado',
    images: [],
    status: 'active',
    ...overrides,
  } as Product;
}

describe('productImage', () => {
  // The API returns images as plain URL strings (Product.images is string[]).
  // Three pages used to read `images[0].url`, which is undefined on a string,
  // so every product silently fell back to the placeholder.
  it('returns the first image URL when the product has images', () => {
    const product = makeProduct({
      images: ['http://localhost:4566/assets/products/a/b/shoe.webp'],
    });
    expect(productImage(product)).toBe('http://localhost:4566/assets/products/a/b/shoe.webp');
  });

  it('returns the placeholder when the product has no images', () => {
    expect(productImage(makeProduct({ images: [] }))).toBe(PRODUCT_IMAGE_PLACEHOLDER);
  });

  it('returns the placeholder when images is missing entirely', () => {
    const product = makeProduct();
    delete (product as Partial<Product>).images;
    expect(productImage(product)).toBe(PRODUCT_IMAGE_PLACEHOLDER);
  });

  it('ignores an empty string and falls back to the placeholder', () => {
    expect(productImage(makeProduct({ images: [''] }))).toBe(PRODUCT_IMAGE_PLACEHOLDER);
  });

  it('points the placeholder at a file that is actually served', () => {
    // A fallback that 404s is worse than no fallback: it renders a broken
    // image icon instead of a neutral box.
    expect(PRODUCT_IMAGE_PLACEHOLDER.startsWith('/')).toBe(true);
    expect(PRODUCT_IMAGE_PLACEHOLDER).not.toBe('/placeholder.jpg');
  });
});

describe('toProductCard', () => {
  it('maps an API product onto the card props, image included', () => {
    const product = makeProduct({
      images: ['http://localhost:4566/assets/shoe.webp'],
      effective_price: 199000,
    } as Partial<Product>);

    const card = toProductCard(product, 'mi-tienda');

    expect(card).toMatchObject({
      id: 'p-1',
      name: 'Tenis Nike',
      image: 'http://localhost:4566/assets/shoe.webp',
      imageAlt: 'Tenis Nike',
      href: '/mi-tienda/producto/p-1',
    });
  });

  it('shows the discounted price and keeps the list price as the original', () => {
    const product = makeProduct({ price: 250000, effective_price: 199000 } as Partial<Product>);
    const card = toProductCard(product, 'mi-tienda');

    expect(card.price).toBe(199000);
    expect(card.originalPrice).toBe(250000);
  });

  it('leaves originalPrice undefined when there is no active discount', () => {
    const product = makeProduct({ price: 250000, effective_price: 250000 } as Partial<Product>);
    expect(toProductCard(product, 'mi-tienda').originalPrice).toBeUndefined();
  });
});
