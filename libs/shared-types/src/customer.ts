export interface Customer {
  id: string;
  store_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: CustomerAddress;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: CustomerAddress;
  notes?: string;
}
