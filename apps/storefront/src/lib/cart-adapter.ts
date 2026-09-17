import type { CartItem as SDKCartItem } from '@goshopping/storefront-sdk';
import type { CartItemData } from '@/components/cart/CartItem';
import { productImage } from './product-image';

/**
 * Design decision 12: adapts the SDK's real cart line shape
 * (`{ product, quantity }`) into the flat props CartDrawer/CartItem render.
 * Those components were originally built against mock props before
 * StorefrontChrome wired the real `useCart` hook — this is the single place
 * that bridges the two shapes so they cannot drift apart again.
 */
export function toCartItemProps(item: SDKCartItem): CartItemData {
  return {
    id: item.product.id,
    name: item.product.name,
    image: productImage(item.product),
    price: item.product.price,
    quantity: item.quantity,
    stock: item.product.stock,
  };
}
