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
  status: 'active' | 'inactive' | 'out_of_stock' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  name: string;
  sku?: string;
  description?: string;
  price: number;
  cost?: number;
  stock?: number;
  min_stock?: number;
  category?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  status?: 'active' | 'inactive';
}
