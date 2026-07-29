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

export interface StoreConfig {
  name: string;
  slug: string;
  domain?: string;
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
