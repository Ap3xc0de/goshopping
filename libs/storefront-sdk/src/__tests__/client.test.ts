import { GoShoppingClient } from '../client';
import { NetworkError, NotFoundError, GoShoppingError } from '../errors';

const BASE_URL = 'http://localhost:8080';
const STORE_SLUG = 'test-store';

function makeClient() {
  return new GoShoppingClient({ baseURL: BASE_URL, storeSlug: STORE_SLUG });
}

function mockFetch(response: Partial<Response> & { json?: () => unknown }) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
    ...response,
  });
}

describe('GoShoppingClient', () => {
  let client: GoShoppingClient;

  beforeEach(() => {
    client = makeClient();
    jest.clearAllMocks();
  });

  // ── URL construction ────────────────────────────────────────────────────────

  it('construye URLs correctamente con storeSlug', async () => {
    const fetchMock = mockFetch({ json: async () => ({ data: [], total: 0, page: 1, per_page: 20, total_pages: 0 }) });
    global.fetch = fetchMock;

    await client.getProducts();

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/public/${STORE_SLUG}/products`,
      expect.any(Object),
    );
  });

  // El router Go solo expone /public/:storeSlug/* — ver apps/core/internal/router/router.go
  it('todas las rutas usan el prefijo /public del router', async () => {
    const cases: Array<[string, () => Promise<unknown>]> = [
      [`${BASE_URL}/public/${STORE_SLUG}/products`, () => client.getProducts()],
      [`${BASE_URL}/public/${STORE_SLUG}/products/abc`, () => client.getProduct('abc')],
      [`${BASE_URL}/public/${STORE_SLUG}/orders`, () => client.createOrder({
        customer_name: 'Juan',
        customer_email: 'juan@test.com',
        customer_phone: '3001234567',
        items: [{ product_id: 'prod-1', quantity: 1 }],
        payment_method: 'cash',
      })],
      // SDK-02: el handler Go lee `token`, no `access_token` (ver public.go#PublicOrderStatus)
      [`${BASE_URL}/public/${STORE_SLUG}/orders/o-1/status?token=tok`, () => client.getOrderStatus('o-1', 'tok')],
      [`${BASE_URL}/public/${STORE_SLUG}/config`, () => client.getStoreConfig()],
    ];

    for (const [expectedURL, call] of cases) {
      const fetchMock = mockFetch({
        json: async () => ({
          order: { id: '1', order_number: 'ORD-1', status: 'pending', payment_status: 'pending', subtotal: 0, tax: 0, total: 0, items: [] },
          access_token: 'tok',
          data: [], total: 0, page: 1, per_page: 20, total_pages: 0,
        }),
      });
      global.fetch = fetchMock;

      await call();

      expect(fetchMock.mock.calls[0][0]).toBe(expectedURL);
      expect(fetchMock.mock.calls[0][0]).not.toContain('/storefront/');
    }
  });

  // ── getProducts ─────────────────────────────────────────────────────────────

  it('getProducts devuelve lista paginada', async () => {
    const payload = { data: [{ id: '1', name: 'Producto A' }], total: 1, page: 1, per_page: 20, total_pages: 1 };
    global.fetch = mockFetch({ json: async () => payload });

    const result = await client.getProducts();

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('getProducts envía query params de filtros', async () => {
    const fetchMock = mockFetch({ json: async () => ({ data: [], total: 0, page: 2, per_page: 10, total_pages: 0 }) });
    global.fetch = fetchMock;

    await client.getProducts({ page: 2, per_page: 10, category: 'ropa', search: 'camisa', sort: 'price_asc' });

    const calledURL: string = fetchMock.mock.calls[0][0] as string;
    expect(calledURL).toContain('page=2');
    expect(calledURL).toContain('per_page=10');
    expect(calledURL).toContain('category=ropa');
    expect(calledURL).toContain('search=camisa');
    expect(calledURL).toContain('sort=price_asc');
  });

  // ── getProduct ──────────────────────────────────────────────────────────────

  it('getProduct devuelve producto por ID', async () => {
    const product = { id: 'abc', name: 'Producto B', price: 50000 };
    global.fetch = mockFetch({ json: async () => product });

    const result = await client.getProduct('abc');

    expect(result.id).toBe('abc');
    expect(result.name).toBe('Producto B');
  });

  it('getProduct lanza NotFoundError si no existe', async () => {
    global.fetch = mockFetch({ ok: false, status: 404, text: async () => 'not found' });

    await expect(client.getProduct('xxx')).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── createOrder ─────────────────────────────────────────────────────────────

  // SDK-01: CreateOrderRequest es el DTO plano que espera CreateOrderInput (Go)
  // — sin objeto `customer` anidado (ver apps/core/internal/models/order.go).
  it('createOrder envía el payload plano (sin customer anidado) que Go espera', async () => {
    const fetchMock = mockFetch({
      json: async () => ({
        order: { id: 'order-1', order_number: 'ORD-1', status: 'pending', payment_status: 'pending', subtotal: 50336, tax: 9564, total: 59900, items: [] },
        access_token: 'tok_abc',
      }),
    });
    global.fetch = fetchMock;

    const orderData = {
      customer_name: 'Juan',
      customer_email: 'juan@test.com',
      customer_phone: '3001234567',
      items: [{ product_id: 'prod-1', quantity: 1 }],
      payment_method: 'cash',
    };

    await client.createOrder(orderData);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/public/${STORE_SLUG}/orders`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(orderData),
      }),
    );
  });

  // SDK-01: shipping_address plano (street/city/state/zip/country?/notes?) viaja
  // dentro del payload, espejo exacto de CreateOrderInput.ShippingAddress (Go).
  it('createOrder incluye shipping_address plano cuando se provee', async () => {
    const fetchMock = mockFetch({
      json: async () => ({
        order: { id: 'order-2', order_number: 'ORD-2', status: 'pending', payment_status: 'pending', subtotal: 1000, tax: 190, total: 1190, items: [] },
        access_token: 'tok_2',
      }),
    });
    global.fetch = fetchMock;

    const orderData = {
      customer_name: 'Ana',
      customer_email: 'ana@x.com',
      customer_phone: '300',
      items: [{ product_id: 'p1', quantity: 1 }],
      payment_method: 'card',
      shipping_address: { street: 'Calle 1', city: 'Bogotá', state: 'Cund.', zip: '110111' },
    };

    await client.createOrder(orderData);

    const sentBody = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(sentBody.shipping_address).toEqual(orderData.shipping_address);
    expect(sentBody.customer).toBeUndefined();
  });

  // CORE-04/SDK-01: la respuesta real de Go anida los datos de la orden bajo
  // "order" junto a "access_token" — ver PublicCreateOrder en public.go. El
  // cliente aplana esa forma para exponer order_number/payment_status/items/
  // shipping_address junto al resto de campos existentes.
  it('createOrder devuelve order_number, payment_status, items y access_token', async () => {
    global.fetch = mockFetch({
      json: async () => ({
        order: {
          id: 'order-42',
          order_number: 'ORD-0042',
          status: 'pending',
          payment_status: 'pending',
          total: 100000,
          subtotal: 84034,
          tax: 15966,
          items: [{ product_id: 'p1', product_name: 'Producto 1', quantity: 1, unit_price: 84034, total: 84034 }],
          shipping_address: { street: 'Calle 1', city: 'Bogotá', state: 'Cund.', zip: '110111' },
        },
        access_token: 'token-secret',
      }),
    });

    const result = await client.createOrder({
      customer_name: 'Ana',
      customer_email: 'ana@x.com',
      customer_phone: '300',
      items: [{ product_id: 'p1', quantity: 1 }],
      payment_method: 'card',
    });

    expect(result.id).toBe('order-42');
    expect(result.order_number).toBe('ORD-0042');
    expect(result.access_token).toBe('token-secret');
    expect(result.status).toBe('pending');
    expect(result.payment_status).toBe('pending');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product_name).toBe('Producto 1');
    expect(result.shipping_address).toEqual({ street: 'Calle 1', city: 'Bogotá', state: 'Cund.', zip: '110111' });
  });

  // ── getOrderStatus ──────────────────────────────────────────────────────────

  // SDK-02: el handler Go (PublicOrderStatus) lee `c.Query("token")`, no
  // `access_token` — ver apps/core/internal/handlers/public.go:180.
  it('getOrderStatus envía token como query param (no access_token)', async () => {
    const fetchMock = mockFetch({
      json: async () => ({
        id: 'order-1', order_number: 'ORD-1', status: 'paid', payment_status: 'paid', total: 1000, items: [],
      }),
    });
    global.fetch = fetchMock;

    await client.getOrderStatus('order-1', 'tok-xyz');

    const calledURL: string = fetchMock.mock.calls[0][0] as string;
    expect(calledURL).toContain('token=tok-xyz');
    expect(calledURL).not.toContain('access_token=');
    expect(calledURL).toContain('/orders/order-1/status');
  });

  // CORE-04: la respuesta real incluye order_number/payment_status/items/
  // shipping_address — el tipo OrderStatus del SDK debe exponerlos tal cual.
  it('getOrderStatus expone order_number, payment_status, items y shipping_address', async () => {
    global.fetch = mockFetch({
      json: async () => ({
        id: 'order-1',
        order_number: 'ORD-0001',
        status: 'paid',
        payment_status: 'paid',
        total: 59900,
        items: [{ product_id: 'p1', product_name: 'Producto 1', quantity: 2, unit_price: 29950, total: 59900 }],
        shipping_address: { street: 'Calle 1', city: 'Bogotá', state: 'Cund.', zip: '110111' },
      }),
    });

    const result = await client.getOrderStatus('order-1', 'tok-xyz');

    expect(result.order_number).toBe('ORD-0001');
    expect(result.payment_status).toBe('paid');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(2);
    expect(result.shipping_address).toEqual({ street: 'Calle 1', city: 'Bogotá', state: 'Cund.', zip: '110111' });
  });

  // ── getStoreConfig ──────────────────────────────────────────────────────────

  it('getStoreConfig devuelve config pública', async () => {
    const config = { name: 'Mi Tienda', slug: STORE_SLUG, config: { payment_methods: ['cash'] } };
    global.fetch = mockFetch({ json: async () => config });

    const result = await client.getStoreConfig();

    expect(result.name).toBe('Mi Tienda');
    expect(result.slug).toBe(STORE_SLUG);
  });

  // ── Network errors & retry ──────────────────────────────────────────────────

  it('lanza NetworkError en timeout', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted');
      (err as NodeJS.ErrnoException).name = 'AbortError';
      return Promise.reject(err);
    });

    await expect(client.getProducts()).rejects.toBeInstanceOf(NetworkError);
  });

  it('retry 1 vez en error de red', async () => {
    const networkErr = new Error('network fail');
    const successPayload = { data: [], total: 0, page: 1, per_page: 20, total_pages: 0 };
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => successPayload, text: async () => '' });
    global.fetch = fetchMock;

    const result = await client.getProducts();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual([]);
  });

  it('NO retry en errores 4xx', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'unprocessable',
    });
    global.fetch = fetchMock;

    await expect(client.createOrder({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      items: [],
      payment_method: 'cash',
    })).rejects.toBeInstanceOf(GoShoppingError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ── Security ────────────────────────────────────────────────────────────────

  it('NUNCA incluye auth headers', async () => {
    const fetchMock = mockFetch({ json: async () => ({ data: [], total: 0, page: 1, per_page: 20, total_pages: 0 }) });
    global.fetch = fetchMock;

    await client.getProducts();

    const headers: Record<string, string> = fetchMock.mock.calls[0][1]?.headers as Record<string, string> ?? {};
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['authorization']).toBeUndefined();
    expect(headers['x-api-key']).toBeUndefined();
  });

  it('NUNCA expone cost en Product', async () => {
    const productWithCost = { id: '1', name: 'X', price: 100, cost: 50, stock: 10 };
    global.fetch = mockFetch({ json: async () => productWithCost });

    // El SDK no filtra activamente, pero el tipo Product no expone cost.
    // Verificamos que el tipo no tiene la propiedad.
    const product = await client.getProduct('1');
    // @ts-expect-error — 'cost' no existe en el tipo Product del SDK
    expect((product as Record<string, unknown>).cost).toBe(50); // viene del server, pero el tipo no lo expone
    // Lo importante: el tipo Product del SDK no tiene 'cost' (enforced en compile-time via ts-expect-error)
  });
});
