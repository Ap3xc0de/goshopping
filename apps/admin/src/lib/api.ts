import type {
  LoginResponse,
  RegisterRequest,
  DashboardMetrics,
  Product,
  Order,
  OrderStatus,
  Customer,
  SalesReport,
  ProductReport,
  CustomerReport,
  PaginatedResponse,
  ProductFilters,
  OrderFilters,
  CustomerFilters,
  ReportFilters,
} from './types';
import { buildQueryString } from './utils';

// ─── Error ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(token: string | null, err: unknown = null) {
  pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(err)));
  pendingQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken =
    typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  if (!refreshToken) throw new ApiError(401, 'no_refresh_token', 'No refresh token');

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new ApiError(401, 'refresh_failed', 'Sesión expirada');

  const data = await res.json();
  localStorage.setItem('access_token', data.access_token);
  return data.access_token as string;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        pendingQueue.push({
          resolve: () => resolve(request<T>(path, init, false)),
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      drainQueue(newToken);
      return request<T>(path, init, false);
    } catch (err) {
      drainQueue(null, err);
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code = 'api_error';
    try {
      const body = await res.json();
      message = body.error ?? message;
      code = body.code ?? code;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── API surface ─────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(data: RegisterRequest): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Dashboard
  getDashboard(storeId: string): Promise<DashboardMetrics> {
    return request<DashboardMetrics>(`/stores/${storeId}/dashboard`);
  },

  // Products
  getProducts(storeId: string, filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    return request<PaginatedResponse<Product>>(
      `/stores/${storeId}/products${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`,
    );
  },

  getProduct(storeId: string, productId: string): Promise<Product> {
    return request<Product>(`/stores/${storeId}/products/${productId}`);
  },

  createProduct(storeId: string, data: Partial<Product>): Promise<Product> {
    return request<Product>(`/stores/${storeId}/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProduct(storeId: string, productId: string, data: Partial<Product>): Promise<Product> {
    return request<Product>(`/stores/${storeId}/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteProduct(storeId: string, productId: string): Promise<void> {
    return request<void>(`/stores/${storeId}/products/${productId}`, { method: 'DELETE' });
  },

  async uploadProductImages(storeId: string, productId: string, files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const result = await request<{ upload_url: string; image_url: string }>(
        `/stores/${storeId}/products/${productId}/images`,
        {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type || 'image/jpeg',
          }),
        },
      );
      // Upload the file directly to the presigned URL (S3 or LocalStack in dev)
      await fetch(result.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'image/jpeg' },
      });
      urls.push(result.image_url);
    }
    return urls;
  },

  // Orders
  getOrders(storeId: string, filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> {
    return request<PaginatedResponse<Order>>(
      `/stores/${storeId}/orders${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`,
    );
  },

  getOrder(storeId: string, orderId: string): Promise<Order> {
    return request<Order>(`/stores/${storeId}/orders/${orderId}`);
  },

  createOrder(storeId: string, data: Partial<Order>): Promise<Order> {
    return request<Order>(`/stores/${storeId}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateOrderStatus(
    storeId: string,
    orderId: string,
    status: OrderStatus,
    note?: string,
    tracking_number?: string,
  ): Promise<Order> {
    return request<Order>(`/stores/${storeId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note, tracking_number }),
    });
  },

  cancelOrder(storeId: string, orderId: string, reason: string): Promise<Order> {
    return request<Order>(`/stores/${storeId}/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  exportOrders(storeId: string): Promise<Blob> {
    return request<Blob>(`/stores/${storeId}/orders/export`);
  },

  // Customers
  getCustomers(
    storeId: string,
    filters: CustomerFilters = {},
  ): Promise<PaginatedResponse<Customer>> {
    return request<PaginatedResponse<Customer>>(
      `/stores/${storeId}/customers${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`,
    );
  },

  getCustomer(storeId: string, customerId: string): Promise<Customer> {
    return request<Customer>(`/stores/${storeId}/customers/${customerId}`);
  },

  getCustomerOrders(storeId: string, customerId: string): Promise<PaginatedResponse<Order>> {
    return request<PaginatedResponse<Order>>(
      `/stores/${storeId}/customers/${customerId}/orders`,
    );
  },

  createCustomer(storeId: string, data: Partial<Customer>): Promise<Customer> {
    return request<Customer>(`/stores/${storeId}/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCustomer(
    storeId: string,
    customerId: string,
    data: Partial<Customer>,
  ): Promise<Customer> {
    return request<Customer>(`/stores/${storeId}/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Reports
  getSalesReport(storeId: string, filters: ReportFilters = {}): Promise<SalesReport> {
    return request<SalesReport>(
      `/stores/${storeId}/reports/sales${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`,
    );
  },

  getProductsReport(storeId: string, filters: ReportFilters = {}): Promise<ProductReport> {
    return request<ProductReport>(
      `/stores/${storeId}/reports/products${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`,
    );
  },

  getCustomersReport(storeId: string, filters: ReportFilters = {}): Promise<CustomerReport> {
    return request<CustomerReport>(
      `/stores/${storeId}/reports/customers${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`,
    );
  },
};
