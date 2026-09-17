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

export interface CreateOrderRequest {
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  payment_method: string;
  notes?: string;
}

export interface CreateOrderResponse {
  id: string;
  status: 'pending';
  total: number;
  subtotal: number;
  tax: number;
  access_token: string;
}

export interface OrderStatus {
  id: string;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_tracking?: string;
  updated_at: string;
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
