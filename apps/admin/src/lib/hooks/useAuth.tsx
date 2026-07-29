'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../api';
import type { Account } from '../types';

// ─── Context ─────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['owner', 'operator', 'accountant'] as const;

interface AuthContextValue {
  account: Account | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, storeName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('account');
    const token = localStorage.getItem('access_token');
    if (stored && token) {
      try {
        const parsed = JSON.parse(stored) as Account;
        if ((ALLOWED_ROLES as readonly string[]).includes(parsed.role)) {
          setAccount(parsed);
        } else {
          localStorage.clear();
        }
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);

    if (!(ALLOWED_ROLES as readonly string[]).includes(data.account.role)) {
      throw new ApiError(
        403,
        'forbidden',
        'Acceso denegado: esta cuenta no tiene acceso al panel de vendedor',
      );
    }

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('account', JSON.stringify(data.account));
    setAccount(data.account);
    router.push('/dashboard');
  }, [router]);

  const register = useCallback(
    async (name: string, email: string, password: string, storeName: string) => {
      const data = await api.register({ name, email, password, store_name: storeName });

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('account', JSON.stringify(data.account));
      setAccount(data.account);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.clear();
    setAccount(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ account, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
