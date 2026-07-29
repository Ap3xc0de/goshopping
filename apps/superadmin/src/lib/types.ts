// ─── Domain Models ──────────────────────────────────────────────────────────

export type AccountRole = 'superadmin' | 'owner' | 'manager' | 'staff';
export type AccountStatus = 'active' | 'suspended' | 'pending';
export type StoreStatus = 'active' | 'inactive' | 'suspended';
export type IntegrationStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface Account {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  stores_count: number;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_name?: string;
  status: StoreStatus;
  products_count: number;
  orders_count: number;
  revenue: number;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  name: string;
  status: IntegrationStatus;
  latency_ms?: number;
  last_checked: string;
  error?: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface DashboardMetrics {
  total_accounts: number;
  active_accounts: number;
  total_stores: number;
  active_stores: number;
  total_orders_today: number;
  revenue_today: number;
  revenue_month: number;
  sales_by_day: Array<{ date: string; revenue: number; orders: number }>;
  top_stores: Array<{ store_id: string; store_name: string; revenue: number; orders: number }>;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthTokens {
  account: Account;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiErrorBody {
  error: string;
  code?: string;
}

// ─── Filter params ───────────────────────────────────────────────────────────

export interface AccountFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: AccountStatus;
  role?: AccountRole;
}

export interface StoreFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: StoreStatus;
  owner_id?: string;
}

export interface AuditLogFilters {
  page?: number;
  per_page?: number;
  actor_id?: string;
  resource_type?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
}
