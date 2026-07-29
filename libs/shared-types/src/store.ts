export interface Store {
  id: string;
  account_id: string;
  name: string;
  slug: string;
  domain?: string;
  status: 'active' | 'inactive' | 'suspended';
  config: StoreConfig;
  created_at: string;
  updated_at: string;
}

export interface StoreConfig {
  currency?: string;
  locale?: string;
  timezone?: string;
}

export interface CreateStoreRequest {
  name: string;
  slug: string;
  domain?: string;
}
