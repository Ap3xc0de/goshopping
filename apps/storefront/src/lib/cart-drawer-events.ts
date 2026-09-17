/**
 * Design decision 12 keeps StorefrontChrome a thin wrapper (no dedicated
 * context provider). The product page's "Ver carrito" toast action
 * (PRODUCT-04) still needs to reopen the drawer that lives inside
 * StorefrontChrome, several components up the tree — a plain `window` event
 * is the smallest cross-tree signal that works without introducing a
 * provider just for this one UI concern.
 */
export const CART_DRAWER_OPEN_EVENT = 'goshopping:cart-drawer:open';

export function openCartDrawer(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_DRAWER_OPEN_EVENT));
  }
}
