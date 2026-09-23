import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatusResponse,
  PaginatedResponse,
  Product,
  ProductListParams,
  QuoteLineItem,
  QuoteResponse,
  StoreConfig,
} from '@/lib/api/types';
import { mockConfig, mockProducts } from '@/lib/mock-data';
import 'server-only';

// SERVER-ONLY module. Reads server env vars and talks to the Go core API.
// The `server-only` import hard-fails a client bundle that tries to include
// this file, keeping the API key out of the browser entirely.

const API_URL = process.env.GOSHOPPING_API_URL ?? 'http://localhost:3000';
const STORE_SLUG = process.env.GOSHOPPING_STORE_SLUG ?? 'thebitequestrian';
const API_KEY = process.env.GOSHOPPING_API_KEY;

const BASE = `${API_URL}/api/v1/${STORE_SLUG}`;
const TAX_RATE = 0.19;
const MOCK_LATENCY_MS = 150;

export const isMockMode = () => !process.env.GOSHOPPING_API_KEY;

export const previewBanner = () => !process.env.GOSHOPPING_API_KEY;

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  return headers;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function warn(...args: unknown[]): void {
  console.warn('[api]', ...args);
}

function mockProductList(params?: ProductListParams): PaginatedResponse<Product> {
  let data = [...mockProducts];
  if (params?.category) {
    data = data.filter((p) => p.category === params.category);
  }
  if (params?.search) {
    const s = params.search.toLowerCase();
    data = data.filter((p) =>
      `${p.name} ${p.description} ${p.sku}`.toLowerCase().includes(s),
    );
  }
  const per_page = params?.per_page ?? 100;
  const page = params?.page ?? 1;
  const total = data.length;
  const total_pages = Math.max(1, Math.ceil(total / per_page));
  const start = (page - 1) * per_page;
  return {
    data: data.slice(start, start + per_page),
    total,
    page,
    per_page,
    total_pages,
  };
}

function mockQuote(items: QuoteLineItem[]): QuoteResponse {
  const lines = items.map((li) => {
    const product = mockProducts.find((p) => p.id === li.product_id);
    if (!product) {
      throw new NotFoundError(`Product ${li.product_id} not found`);
    }
    return {
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      unit_price: product.effective_price,
      quantity: li.quantity,
      line_total: product.effective_price * li.quantity,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + tax);
  return { items: lines, subtotal: round2(subtotal), tax, total, currency: 'USD' };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getStoreConfig(): Promise<StoreConfig> {
  if (isMockMode()) {
    await delay(MOCK_LATENCY_MS);
    return mockConfig;
  }
  try {
    const res = await fetch(`${BASE}/config`, {
      next: { revalidate: 30 },
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`getStoreConfig failed: ${res.status}`);
    return (await res.json()) as StoreConfig;
  } catch (err) {
    warn('getStoreConfig failed, falling back to mock', err);
    return mockConfig;
  }
}

export async function getProducts(
  params?: ProductListParams,
): Promise<PaginatedResponse<Product>> {
  if (isMockMode()) {
    await delay(MOCK_LATENCY_MS);
    return mockProductList(params);
  }
  try {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await fetch(`${BASE}/products${suffix}`, {
      next: { revalidate: 60 },
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`getProducts failed: ${res.status}`);
    return (await res.json()) as PaginatedResponse<Product>;
  } catch (err) {
    warn('getProducts failed, falling back to mock', err);
    return mockProductList(params);
  }
}

export async function getProduct(id: string): Promise<Product> {
  if (isMockMode()) {
    await delay(MOCK_LATENCY_MS);
    const product = mockProducts.find((p) => p.id === id);
    if (!product) throw new NotFoundError(`Product ${id} not found`);
    return product;
  }
  try {
    const res = await fetch(`${BASE}/products/${id}`, {
      next: { revalidate: 60 },
      headers: authHeaders(),
    });
    if (res.status === 404) throw new NotFoundError(`Product ${id} not found`);
    if (!res.ok) throw new Error(`getProduct failed: ${res.status}`);
    return (await res.json()) as Product;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    warn('getProduct failed, falling back to mock', err);
    const product = mockProducts.find((p) => p.id === id);
    if (!product) throw new NotFoundError(`Product ${id} not found`);
    return product;
  }
}

export async function getCategories(): Promise<{ name: string; count: number }[]> {
  const res = await getProducts({ per_page: 100 });
  const counts = new Map<string, number>();
  for (const p of res.data) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

export async function quote(items: QuoteLineItem[]): Promise<QuoteResponse> {
  if (isMockMode()) {
    await delay(MOCK_LATENCY_MS);
    return mockQuote(items);
  }
  try {
    const res = await fetch(`${BASE}/quote`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error(`quote failed: ${res.status}`);
    return (await res.json()) as QuoteResponse;
  } catch (err) {
    warn('quote failed, falling back to mock', err);
    return mockQuote(items);
  }
}

export async function createOrder(
  payload: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  if (isMockMode()) {
    await delay(MOCK_LATENCY_MS);
    const res = mockQuote(payload.items);
    return {
      order_id: genId(),
      status: 'pending',
      access_token: genId(),
      total: res.total,
    };
  }
  try {
    const res = await fetch(`${BASE}/orders`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`createOrder failed: ${res.status}`);
    return (await res.json()) as CreateOrderResponse;
  } catch (err) {
    warn('createOrder failed, falling back to mock', err);
    const res = mockQuote(payload.items);
    return {
      order_id: genId(),
      status: 'pending',
      access_token: genId(),
      total: res.total,
    };
  }
}

export async function getOrderStatus(
  orderId: string,
  token: string,
): Promise<OrderStatusResponse> {
  if (isMockMode()) {
    await delay(MOCK_LATENCY_MS);
    return { order_id: orderId, status: 'processing', items: [] };
  }
  try {
    const res = await fetch(
      `${BASE}/orders/${orderId}/status?token=${encodeURIComponent(token)}`,
      { next: { revalidate: 60 }, headers: authHeaders() },
    );
    if (!res.ok) throw new Error(`getOrderStatus failed: ${res.status}`);
    return (await res.json()) as OrderStatusResponse;
  } catch (err) {
    warn('getOrderStatus failed, falling back to mock', err);
    return { order_id: orderId, status: 'processing', items: [] };
  }
}
