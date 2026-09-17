// ── Producto (público — NO incluye cost) ──────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  status: 'active' | 'out_of_stock';
}

// ── Tienda ────────────────────────────────────────────────────────────────────

// Mirrors apps/core/internal/models/branding.go — same snake_case JSON keys,
// same convention already used by apps/admin/src/lib/types.ts#BrandColors.
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
}

export interface BrandFonts {
  heading?: string;
  body?: string;
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

export interface StoreConfig {
  name: string;
  slug: string;
  domain?: string;
  /**
   * `id`/`branding`/`template_id` are fields GET /public/:storeSlug/config
   * and GET /public/by-domain/:host/config actually return since Slice 4
   * (REQ-RESOLVE-03) — added here as optional to avoid widening this type's
   * blast radius onto every existing consumer of the legacy `config` shape
   * below, which predates this change and is left untouched.
   */
  id?: string;
  branding?: StoreBranding;
  template_id?: string;
  config: {
    colors?: { primary?: string; secondary?: string; accent?: string };
    logo_url?: string;
    meta_pixel_id?: string;
    google_ads_id?: string;
    payment_methods?: string[];
  };
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

// Mirrors apps/core/internal/models/order.go#ShippingAddress — same shape is
// sent on CreateOrderRequest and returned inside order responses.
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  notes?: string;
}

// Mirrors apps/core/internal/models/order.go#OrderItem (persisted JSONB line item).
export interface OrderLineItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Mirrors apps/core/internal/models/order.go#Order.PaymentStatus (independent
// of order fulfillment `status`).
export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// Mirrors apps/core/internal/models/order.go#CreateOrderInput — flat DTO, NOT
// a nested `customer` object (design decision 5: SDK aligns to Go, not the
// other way around).
export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  payment_method: string;
  coupon_code?: string;
  notes?: string;
  shipping_address?: ShippingAddress;
}

// POST /public/:storeSlug/orders (PublicCreateOrder, public.go) actually
// returns `{ order: {...fields...}, access_token }` — the client flattens
// that wrapper (see client.ts#createOrder) into this consumer-friendly shape.
export interface CreateOrderResponse {
  id: string;
  order_number: string;
  status: 'pending';
  payment_status: OrderPaymentStatus;
  total: number;
  subtotal: number;
  tax: number;
  items: OrderLineItem[];
  shipping_address?: ShippingAddress | null;
  access_token: string;
}

// GET /public/:storeSlug/orders/:orderId/status (PublicOrderStatus, public.go)
// — field set matches exactly what that handler returns today (no
// `shipping_tracking`/`updated_at`; kept out to avoid claiming fields the
// endpoint never sends).
export interface OrderStatus {
  id: string;
  order_number: string;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: OrderPaymentStatus;
  total: number;
  items: OrderLineItem[];
  shipping_address?: ShippingAddress | null;
}

// ── Paginación ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ── Carrito ───────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

// ── Parámetros de hooks ───────────────────────────────────────────────────────

export interface ProductParams {
  page?: number;
  per_page?: number;
  category?: string;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name';
}
