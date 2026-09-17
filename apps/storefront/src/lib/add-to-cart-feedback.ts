import { toast } from 'sonner';
import { StockError } from '@goshopping/storefront-sdk';
import type { Product } from '@goshopping/storefront-sdk';
import { openCartDrawer } from './cart-drawer-events';

/**
 * PRODUCT-04: shared feedback for every "add to cart" entry point (product
 * detail page, catalog quick-add) so a `StockError` thrown by
 * `CartManager.addItem` always surfaces the same readable message instead of
 * crashing the page or failing silently, and a successful add always shows
 * the same confirmation with a "Ver carrito" action.
 */
export function addToCartWithFeedback(
  addItem: (product: Product, quantity?: number) => void,
  product: Product,
  quantity: number = 1,
): void {
  try {
    addItem(product, quantity);
    toast.success(`${product.name} agregado al carrito`, {
      action: { label: 'Ver carrito', onClick: openCartDrawer },
    });
  } catch (error) {
    if (error instanceof StockError) {
      toast.error(`Solo quedan ${error.available} unidades disponibles`);
    } else {
      toast.error('No se pudo agregar el producto al carrito');
    }
  }
}
