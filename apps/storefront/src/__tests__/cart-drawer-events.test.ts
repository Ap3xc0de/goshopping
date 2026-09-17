/**
 * @jest-environment jsdom
 */
import { CART_DRAWER_OPEN_EVENT, openCartDrawer } from '@/lib/cart-drawer-events';

describe('openCartDrawer (PRODUCT-04 "Ver carrito" wiring)', () => {
  it('dispatches CART_DRAWER_OPEN_EVENT on window', () => {
    const handler = jest.fn();
    window.addEventListener(CART_DRAWER_OPEN_EVENT, handler);

    openCartDrawer();

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(CART_DRAWER_OPEN_EVENT, handler);
  });

  it('does not throw when called twice (idempotent dispatch)', () => {
    expect(() => {
      openCartDrawer();
      openCartDrawer();
    }).not.toThrow();
  });
});
