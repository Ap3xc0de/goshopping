export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  store_id: string;
  customer_id?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method?: string;
  payment_ref?: string;
  shipping_tracking?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  customer_id?: string;
  items: Array<{ product_id: string; quantity: number }>;
  payment_method?: string;
  notes?: string;
}

export interface OrderTimeline {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by?: string;
  notes?: string;
  created_at: string;
}
