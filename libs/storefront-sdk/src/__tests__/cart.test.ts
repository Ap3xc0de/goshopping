import { CartManager } from '../cart';
import { StockError } from '../errors';
import type { Product } from '../types';

const STORE_SLUG = 'test-store';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Camiseta',
    sku: 'CAM-001',
    description: 'Descripción',
    price: 50000,
    stock: 10,
    category: 'ropa',
    images: [],
    status: 'active',
    ...overrides,
  };
}

describe('CartManager', () => {
  let cart: CartManager;

  beforeEach(() => {
    localStorage.clear();
    cart = new CartManager(STORE_SLUG);
  });

  // ── Estado inicial ──────────────────────────────────────────────────────────

  it('inicia con carrito vacío', () => {
    const result = cart.getCart();
    expect(result.items).toHaveLength(0);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
    expect(result.itemCount).toBe(0);
  });

  // ── addItem ─────────────────────────────────────────────────────────────────

  it('addItem agrega producto al carrito', () => {
    const product = makeProduct();
    const result = cart.addItem(product);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].product.id).toBe('prod-1');
    expect(result.items[0].quantity).toBe(1);
  });

  it('addItem suma cantidad si producto ya existe', () => {
    const product = makeProduct();
    cart.addItem(product, 2);
    const result = cart.addItem(product, 3);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(5);
  });

  it('addItem valida stock disponible', () => {
    const product = makeProduct({ stock: 3 });
    expect(() => cart.addItem(product, 5)).toThrow(StockError);
  });

  it('addItem lanza StockError si no hay stock', () => {
    const product = makeProduct({ stock: 0 });
    expect(() => cart.addItem(product, 1)).toThrow(StockError);
  });

  // ── removeItem ──────────────────────────────────────────────────────────────

  it('removeItem elimina producto', () => {
    cart.addItem(makeProduct());
    const result = cart.removeItem('prod-1');
    expect(result.items).toHaveLength(0);
  });

  // ── updateQuantity ──────────────────────────────────────────────────────────

  it('updateQuantity actualiza cantidad', () => {
    cart.addItem(makeProduct());
    const result = cart.updateQuantity('prod-1', 4);
    expect(result.items[0].quantity).toBe(4);
  });

  it('updateQuantity elimina si quantity <= 0', () => {
    cart.addItem(makeProduct());
    const result = cart.updateQuantity('prod-1', 0);
    expect(result.items).toHaveLength(0);
  });

  // ── clearCart ───────────────────────────────────────────────────────────────

  it('clearCart vacía el carrito', () => {
    cart.addItem(makeProduct());
    const result = cart.clearCart();
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ── Cálculos ────────────────────────────────────────────────────────────────

  it('calcula subtotal correctamente', () => {
    const product = makeProduct({ price: 50000 });
    const result = cart.addItem(product, 2);
    expect(result.subtotal).toBe(100000);
  });

  it('calcula IVA 19% correctamente', () => {
    const product = makeProduct({ price: 100000 });
    const result = cart.addItem(product, 1);
    expect(result.tax).toBe(19000);
  });

  it('calcula total = subtotal + tax', () => {
    const product = makeProduct({ price: 100000 });
    const result = cart.addItem(product, 1);
    expect(result.total).toBe(result.subtotal + result.tax);
  });

  // ── Persistencia ────────────────────────────────────────────────────────────

  it('persiste en localStorage', () => {
    cart.addItem(makeProduct(), 2);
    const raw = localStorage.getItem(`goshopping_cart_${STORE_SLUG}`);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored[0].quantity).toBe(2);
  });

  it('recupera carrito de localStorage al iniciar', () => {
    cart.addItem(makeProduct(), 3);
    const newCart = new CartManager(STORE_SLUG); // nuevo manager, misma key
    const result = newCart.getCart();
    expect(result.items[0].quantity).toBe(3);
  });

  // CART-05: prueba de persistencia end-to-end para el wiring de Slice 5 — un
  // CartManager nuevo (simula el remount del hook `useCart` tras un reload de
  // página) recupera TODOS los items con sus cantidades exactas, no solo el
  // primero. Es una prueba de aprobación (no cambia producción: la
  // persistencia ya existe desde antes de esta slice — ver decisión 8 del
  // design) que documenta el contrato que StorefrontChrome/Navbar/CartDrawer
  // dependen de él.
  it('CART-05: sobrevive completo (múltiples items) a un nuevo CartManager que simula un reload de página', () => {
    cart.addItem(makeProduct({ id: 'p1', name: 'Camiseta' }), 2);
    cart.addItem(makeProduct({ id: 'p2', name: 'Pantalón' }), 1);

    const reloaded = new CartManager(STORE_SLUG);
    const result = reloaded.getCart();

    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => [i.product.id, i.quantity])).toEqual([
      ['p1', 2],
      ['p2', 1],
    ]);
    expect(result.itemCount).toBe(3);
  });

  // CART-06: dos tiendas distintas usan claves de localStorage distintas
  // (`goshopping_cart_${storeSlug}`) — un carrito de la tienda A jamás debe
  // aparecer en el carrito de la tienda B.
  it('CART-06: aísla carritos por storeSlug — la tienda B no ve items de la tienda A', () => {
    const cartA = new CartManager('tienda-a');
    const cartB = new CartManager('tienda-b');

    cartA.addItem(makeProduct({ id: 'solo-en-a' }), 2);

    expect(cartA.getCart().items).toHaveLength(1);
    expect(cartB.getCart().items).toHaveLength(0);
    expect(cartB.itemCount).toBe(0);
  });

  // ── Listeners ───────────────────────────────────────────────────────────────

  it('notifica listeners al cambiar', () => {
    const listener = jest.fn();
    cart.subscribe(listener);
    cart.addItem(makeProduct());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].items).toHaveLength(1);
  });

  it('unsuscribe deja de notificar', () => {
    const listener = jest.fn();
    const unsub = cart.subscribe(listener);
    unsub();
    cart.addItem(makeProduct());
    expect(listener).not.toHaveBeenCalled();
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  it('itemCount suma todas las cantidades', () => {
    cart.addItem(makeProduct({ id: 'p1' }), 2);
    cart.addItem(makeProduct({ id: 'p2' }), 3);
    expect(cart.itemCount).toBe(5);
  });

  it('isEmpty es true cuando no hay items', () => {
    expect(cart.isEmpty).toBe(true);
    cart.addItem(makeProduct());
    expect(cart.isEmpty).toBe(false);
  });

  // ── Precisión decimal ───────────────────────────────────────────────────────

  it('calcula correctamente con precios decimales', () => {
    // price: 49999.99, quantity: 3
    // subtotal: 149999.97
    // tax: 149999.97 × 0.19 = 28499.9943 → Math.round(...*100)/100 = 28499.99
    // total: 149999.97 + 28499.99 = 178499.96
    const product = makeProduct({ id: 'dec', price: 49999.99, stock: 10 });
    const result = cart.addItem(product, 3);

    expect(result.subtotal).toBeCloseTo(149999.97, 2);
    expect(result.tax).toBeCloseTo(28499.99, 2);
    expect(result.total).toBeCloseTo(178499.96, 2);
  });
});
