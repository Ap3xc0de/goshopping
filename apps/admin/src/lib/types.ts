// ─── Domain Models ──────────────────────────────────────────────────────────

export type StoreRole = 'owner' | 'operator' | 'accountant';
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'nequi' | 'daviplata' | 'other';

export interface Account {
  id: string;
  name: string;
  email: string;
  role: StoreRole;
  status: string;
  stores: StoreRef[];
  created_at: string;
  updated_at: string;
}

export interface StoreRef {
  store_id: string;
  store_name: string;
  role: StoreRole;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  currency: string;
  country: string;
  owner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ─── Branding (mirrors apps/core/internal/models/branding.go) ──────────────

export interface BrandColors {
  primary?: string;
  primary_foreground?: string;
  secondary?: string;
  secondary_foreground?: string;
  accent?: string;
  accent_foreground?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  /**
   * Dedicated Navbar colors (independent of secondary/background) — mirrors
   * `NavBackground`/`NavText` in apps/core/internal/models/branding.go
   * (design decision 9 of sdd/storefront-single-template-ecommerce).
   */
  nav_background?: string;
  nav_text?: string;
}

export interface BrandFonts {
  heading?: string;
  body?: string;
}

/** Mirrors the tenant-facing view returned by GET /stores/:storeId/domain. */
export interface StoreDomain {
  hostname: string;
  kind: 'generic' | 'custom';
  status: 'pending' | 'verifying' | 'active' | 'failed';
  is_primary: boolean;
}

export interface StoreBranding {
  brand_name?: string;
  tagline?: string;
  logo_url?: string;
  favicon_url?: string;
  colors?: BrandColors;
  fonts?: BrandFonts;
  radius?: string;
  social_links?: Record<string, string>;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  min_stock: number;
  category?: string;
  images: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface OrderTimelineEntry {
  id: string;
  status: OrderStatus;
  note?: string;
  changed_by: string;
  changed_by_name: string;
  created_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  /**
   * Independent of `status` (CORE-02 in apps/core/internal/models/order.go)
   * — DB default `'pending'`, optional here so existing mocks/fixtures that
   * predate this field keep type-checking.
   */
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: PaymentMethod;
  payment_reference?: string;
  tracking_number?: string;
  notes?: string;
  timeline: OrderTimelineEntry[];
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  orders_count: number;
  total_spent: number;
  last_order_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  sales_today: number;
  sales_month: number;
  sales_prev_month: number;
  pending_orders: number;
  low_stock_count: number;
  recent_orders: Order[];
  low_stock_products: Product[];
  sales_by_day: Array<{ date: string; revenue: number; orders: number }>;
}

export interface SalesReport {
  period: string;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  by_day: Array<{ date: string; revenue: number; orders: number }>;
}

export interface ProductReport {
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
}

export interface CustomerReport {
  top_customers: Array<{
    customer_id: string;
    customer_name: string;
    orders_count: number;
    total_spent: number;
    avg_order_value: number;
  }>;
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

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  account: Account;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  store_name: string;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface ProductFilters {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  status?: string;
}

export interface OrderFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: OrderStatus | '';
}

export interface CustomerFilters {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ReportFilters {
  period?: 'today' | '7d' | '30d' | 'custom';
  start_date?: string;
  end_date?: string;
}
