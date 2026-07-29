import type {
  Account,
  Store,
  Integration,
  AuditLogEntry,
  DashboardMetrics,
  PaginatedResponse,
  LoginResponse,
  AccountFilters,
  StoreFilters,
  AuditLogFilters,
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
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  if (!refreshToken) throw new ApiError(401, 'no_refresh_token', 'No refresh token');

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    throw new ApiError(401, 'refresh_failed', 'Session expired');
  }

  const data = await res.json();
  localStorage.setItem('access_token', data.access_token);
  return data.access_token as string;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

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
          resolve: (t) => resolve(request<T>(path, init, false)),
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
      // Redirect to login
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

  // Dashboard
  getDashboard(): Promise<DashboardMetrics> {
    return request<DashboardMetrics>('/admin/dashboard');
  },

  // Accounts
  getAccounts(filters: AccountFilters = {}): Promise<PaginatedResponse<Account>> {
    return request<PaginatedResponse<Account>>(`/admin/accounts${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`);
  },

  getAccount(id: string): Promise<Account> {
    return request<Account>(`/admin/accounts/${id}`);
  },

  updateAccount(id: string, body: Partial<Pick<Account, 'status'>>): Promise<Account> {
    return request<Account>(`/admin/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // Stores
  getStores(filters: StoreFilters = {}): Promise<PaginatedResponse<Store>> {
    return request<PaginatedResponse<Store>>(`/admin/stores${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`);
  },

  getStore(id: string): Promise<Store> {
    return request<Store>(`/admin/stores/${id}`);
  },

  updateStore(id: string, body: Partial<Pick<Store, 'status'>>): Promise<Store> {
    return request<Store>(`/admin/stores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // Audit log
  getAuditLog(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLogEntry>> {
    return request<PaginatedResponse<AuditLogEntry>>(`/admin/audit-log${buildQueryString(filters as Record<string, string | number | boolean | undefined>)}`);
  },

  // Integrations
  getIntegrationsHealth(): Promise<Integration[]> {
    return request<Integration[]>('/admin/integrations/health');
  },
};
