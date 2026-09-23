export interface PublicOffer {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  ends_at: string | null;
}

export interface PublicVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  stock: number;
  status: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  effective_price: number;
  active_offer: PublicOffer | null;
  stock: number;
  category: string;
  images: string[];
  status: 'active' | 'out_of_stock';
  weight?: number;
  variants?: PublicVariant[];
}

// Category tree node returned by GET /categories (catalog-browsing REQ:
// Hierarchical Categories with Real Counts).
export interface Category {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  children: Category[];
}

// Shipping method returned by GET /shipping-methods (shipping-zones REQ:
// List Public Methods). base_price/weight_rate are indicative — the real
// shipping_total for a cart is only known from POST /quote.
export interface ShippingMethod {
  zone: { name: string };
  code: string;
  name: string;
  base_price: number;
  weight_rate: number;
}

export interface StoreBranding {
  brand_name?: string;
  tagline?: string;
  logo_url?: string;
  favicon_url?: string;
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  radius?: string;
  social_links?: Record<string, string>;
}

export interface StoreConfig {
  id: string;
  name: string;
  slug: string;
  status: string;
  branding: StoreBranding;
  template_id: string;
  // store-currency REQ: USD is the only currency, default when omitted.
  currency: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ProductListParams {
  page?: number;
  per_page?: number;
  category?: string;
  search?: string;
}

// QuoteLineItem is a request line for POST /quote and POST /orders.
// variant_id is optional (product-variants REQ: Variant-Aware Quote).
export interface QuoteLineItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

export interface QuoteRequest {
  items: QuoteLineItem[];
  coupon_code?: string;
  shipping_method?: string;
}

// QuoteResponseItem mirrors the core's services.LineItem JSON shape.
export interface QuoteResponseItem {
  product_id: string;
  quantity: number;
  list_price: number;
  category: string;
}

// QuoteResponse mirrors services.CartPreview exactly (shipping-zones REQ:
// Quote Carrier Cost — total = effective_subtotal − discount_total +
// shipping_total + tax).
export interface QuoteResponse {
  items: QuoteResponseItem[];
  subtotal_before_discount: number;
  effective_subtotal: number;
  discount_total: number;
  applied_coupon?: unknown;
  tax: number;
  shipping_total: number;
  total: number;
}

// ShippingAddress mirrors the core's models.ShippingAddress contract exactly
// (CORE-01: street/city/state/zip required, country/notes optional).
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  notes?: string;
}

export interface OrderLineItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address: ShippingAddress;
  items: OrderLineItem[];
  shipping_method?: string;
  coupon_code?: string;
  notes?: string;
}

// CreateOrderResponse mirrors the core's {order, access_token} shape — order
// embeds models.Order (id/status/total at the top level).
export interface CreateOrderResponse {
  order: {
    id: string;
    status: string;
    total: number;
  };
  access_token: string;
}

export interface OrderStatusResponse {
  order_id: string;
  status: string;
  items?: unknown[];
}
