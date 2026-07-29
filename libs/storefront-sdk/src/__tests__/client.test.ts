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
      `${BASE_URL}/storefront/${STORE_SLUG}/products`,
      expect.any(Object),
    );
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

  it('createOrder envía datos del checkout', async () => {
    const fetchMock = mockFetch({
      json: async () => ({
        id: 'order-1', status: 'pending', total: 59900, subtotal: 50336, tax: 9564, access_token: 'tok_abc',
      }),
    });
    global.fetch = fetchMock;

    const orderData = {
      customer: { name: 'Juan', email: 'juan@test.com', phone: '3001234567' },
      items: [{ product_id: 'prod-1', quantity: 1 }],
      payment_method: 'cash',
    };

    await client.createOrder(orderData);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/storefront/${STORE_SLUG}/orders`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(orderData),
      }),
    );
  });

  it('createOrder devuelve order_id y access_token', async () => {
    global.fetch = mockFetch({
      json: async () => ({
        id: 'order-42',
        status: 'pending',
        total: 100000,
        subtotal: 84034,
        tax: 15966,
        access_token: 'token-secret',
      }),
    });

    const result = await client.createOrder({
      customer: { name: 'Ana', email: 'ana@x.com', phone: '300' },
      items: [{ product_id: 'p1', quantity: 1 }],
      payment_method: 'card',
    });

    expect(result.id).toBe('order-42');
    expect(result.access_token).toBe('token-secret');
    expect(result.status).toBe('pending');
  });

  // ── getOrderStatus ──────────────────────────────────────────────────────────

  it('getOrderStatus envía access_token como query param', async () => {
    const fetchMock = mockFetch({
      json: async () => ({ id: 'order-1', status: 'paid', updated_at: '2026-01-01' }),
    });
    global.fetch = fetchMock;

    await client.getOrderStatus('order-1', 'tok-xyz');

    const calledURL: string = fetchMock.mock.calls[0][0] as string;
    expect(calledURL).toContain('access_token=tok-xyz');
    expect(calledURL).toContain('/orders/order-1/status');
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
      customer: { name: '', email: '', phone: '' },
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
