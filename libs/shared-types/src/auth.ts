export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  account: Account;
}

export interface Account {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'owner';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  sub: string; // account_id
  role: string;
  stores: StoreAccess[];
  token_type: 'access' | 'refresh';
  exp: number;
  iat: number;
}

export interface StoreAccess {
  store_id: string;
  role: 'owner' | 'operator' | 'accountant';
}

export interface RefreshRequest {
  refresh_token: string;
}
