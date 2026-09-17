import type { Product } from '@goshopping/storefront-sdk';
import type { ProductCardProps } from '@/components/product/ProductCard';

/**
 * Shown when a product has no image. It is an SVG that actually ships in
 * public/ — the previous fallback pointed at /placeholder.jpg, a file that
 * does not exist, so a product without images rendered a broken-image icon
 * instead of a neutral box.
 */
export const PRODUCT_IMAGE_PLACEHOLDER = '/product-placeholder.svg';

/**
 * Returns the product's display image.
 *
 * `Product.images` is `string[]` — a list of URLs, not objects. Three pages
 * read `images[0].url`, which is `undefined` on a string, so every product
 * fell through to the placeholder no matter how many images it had. The
 * mapping lives here now so the three call sites cannot drift apart again.
 */
export function productImage(product: Pick<Product, 'images'>): string {
  const first = product.images?.[0];
  return typeof first === 'string' && first.length > 0 ? first : PRODUCT_IMAGE_PLACEHOLDER;
}

/** Product as returned by the public API, including the offer-engine fields. */
type PublicProduct = Product & { effective_price?: number };

/**
 * Maps an API product onto ProductCard's props.
 *
 * `effective_price` is what the offer engine resolved for this product, so
 * that is the price the shopper pays; the list price is kept as
 * `originalPrice` only when it is actually higher, so cards without a
 * discount do not render a struck-through price identical to the real one.
 */
export function toProductCard(product: PublicProduct, storeSlug: string): ProductCardProps {
  const listPrice = product.price;
  const effective = product.effective_price ?? listPrice;
  const discounted = effective < listPrice;

  return {
    id: product.id,
    name: product.name,
    price: effective,
    originalPrice: discounted ? listPrice : undefined,
    image: productImage(product),
    imageAlt: product.name,
    href: `/${storeSlug}/producto/${product.id}`,
  };
}
