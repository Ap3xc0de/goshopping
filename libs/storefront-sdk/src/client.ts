import type {
  Product,
  StoreConfig,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatus,
  PaginatedResponse,
} from './types';

// Raw shape actually returned by POST /public/:storeSlug/orders
// (PublicCreateOrder, public.go) — order fields flattened via Go's anonymous
// struct embedding (OrderDetail embeds models.Order) plus a sibling
// access_token. createOrder() below flattens this into CreateOrderResponse.
interface RawCreateOrderResponse {
  order: Omit<CreateOrderResponse, 'access_token'>;
  access_token: string;
}
import { GoShoppingError, NetworkError, NotFoundError } from './errors';

// Re-exported so server components can `import type { StoreBranding } from
// '@goshopping/storefront-sdk/client'` without ever touching the barrel
// (`./index.ts`), which also re-exports `./hooks` ('use client').
export type { StoreConfig, StoreBranding, BrandColors, BrandFonts } from './types';

const TIMEOUT_MS = 10_000;

export class GoShoppingClient {
  private baseURL: string;
  private storeSlug: string;

  constructor(config: { baseURL?: string; storeSlug: string }) {
    this.baseURL =
      config.baseURL ??
      (typeof process !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL ?? '')
        : '');
    this.storeSlug = config.storeSlug;
  }

  // Debe coincidir con el grupo /public de apps/core/internal/router/router.go
  private get basePath(): string {
    return `/public/${this.storeSlug}`;
  }

  // ── Productos ──────────────────────────────────────────────────────────────

  async getProducts(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    search?: string;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'name';
  }): Promise<PaginatedResponse<Product>> {
    const qs = params ? this.toQueryString(params as Record<string, unknown>) : '';
    return this.fetch<PaginatedResponse<Product>>(
      `${this.basePath}/products${qs}`,
    );
  }

  async getProduct(productId: string): Promise<Product> {
    return this.fetch<Product>(`${this.basePath}/products/${productId}`);
  }

  async getCategories(): Promise<string[]> {
    // La API pública no tiene endpoint dedicado — extrae categorías únicas de productos
    const response = await this.getProducts({ per_page: 500 });
    const categories = new Set<string>();
    for (const product of response.data) {
      if (product.category) categories.add(product.category);
    }
    return Array.from(categories).sort();
  }

  // ── Pedidos ────────────────────────────────────────────────────────────────

  async createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    const raw = await this.fetch<RawCreateOrderResponse>(`${this.basePath}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { ...raw.order, access_token: raw.access_token };
  }

  // SDK-02: el query param DEBE llamarse `token` — PublicOrderStatus
  // (public.go) lee `c.Query("token")`, no `access_token`.
  async getOrderStatus(orderId: string, accessToken: string): Promise<OrderStatus> {
    return this.fetch<OrderStatus>(
      `${this.basePath}/orders/${orderId}/status?token=${encodeURIComponent(accessToken)}`,
    );
  }

  // ── Tienda ─────────────────────────────────────────────────────────────────

  async getStoreConfig(): Promise<StoreConfig> {
    return this.fetch<StoreConfig>(`${this.basePath}/config`);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    // SECURITY: NO auth headers — la API pública no requiere autenticación
    const init: RequestInit = { ...options, headers: { ...headers, ...options?.headers } };

    const attempt = async (): Promise<T> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await globalThis.fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timer);

        if (!res.ok) {
          // 4xx → NO retry
          if (res.status === 404) throw new NotFoundError();
          const body = await res.text().catch(() => '');
          throw new GoShoppingError(res.status, body || `Error ${res.status}`, 'API_ERROR');
        }

        return res.json() as Promise<T>;
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof GoShoppingError) throw err;
        // AbortError = timeout
        if (err instanceof Error && err.name === 'AbortError') {
          throw new NetworkError('Timeout: la solicitud tardó más de 10 segundos');
        }
        throw new NetworkError(err instanceof Error ? err.message : 'Error de conexión');
      }
    };

    try {
      return await attempt();
    } catch (err) {
      // Retry 1 vez solo en errores de red (NetworkError), NO en errores de API (4xx/5xx)
      if (err instanceof NetworkError) {
        return attempt();
      }
      throw err;
    }
  }

  private toQueryString(params: Record<string, unknown>): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  }
}
