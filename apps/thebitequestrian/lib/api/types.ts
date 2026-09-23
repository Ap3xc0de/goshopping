export interface PublicOffer {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  ends_at: string | null;
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

export interface QuoteLineItem {
  product_id: string;
  quantity: number;
}

export interface QuoteItem {
  product_id: string;
  name: string;
  sku: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface QuoteResponse {
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency?: string;
}

export interface OrderLineItem {
  product_id: string;
  quantity: number;
}

export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postal_code: string;
    country: string;
    notes?: string;
  };
  items: OrderLineItem[];
  shipping_method?: string;
}

export interface CreateOrderResponse {
  order_id: string;
  status: string;
  access_token: string;
  total: number;
}

export interface OrderStatusResponse {
  order_id: string;
  status: string;
  items?: unknown[];
}
