'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/hooks/useStore';
import { api } from '@/lib/api';
import { Toast } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { StoreAPIKey } from '@/lib/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

const V1_ENDPOINTS = [
  { method: 'GET', path: '/config' },
  { method: 'GET', path: '/products' },
  { method: 'GET', path: '/products/:productId' },
  { method: 'POST', path: '/quote' },
  { method: 'POST', path: '/orders' },
  { method: 'GET', path: '/orders/:orderId/status' },
];

type ToastState = { message: string; type: 'success' | 'error' } | null;

export default function MyStorePage() {
  const { storeId } = useStore();

  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keys, setKeys] = useState<StoreAPIKey[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadKeys = useCallback(async () => {
    if (!storeId) return;
    const list = await api.listAPIKeys(storeId);
    setKeys(list);
  }, [storeId]);

  useEffect(() => {
    async function load() {
      if (!storeId) return;
      setLoading(true);
      try {
        const store = await api.getStore(storeId);
        setSlug(store.slug);
        await loadKeys();
      } catch {
        setError('No pudimos cargar la información de tu tienda');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId, loadKeys]);

  const handleCreate = async () => {
    if (!storeId || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.createAPIKey(storeId, newName.trim());
      setNewPlaintext(res.plaintext);
      setNewName('');
      await loadKeys();
    } catch {
      setToast({ message: 'No pudimos crear la clave', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!storeId) return;
    try {
      await api.revokeAPIKey(storeId, keyId);
      setKeys((k) => k.filter((x) => x.id !== keyId));
      setToast({ message: 'Clave revocada', type: 'success' });
    } catch {
      setToast({ message: 'No pudimos revocar la clave', type: 'error' });
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ message: 'Copiado', type: 'success' });
    } catch {
      setToast({ message: 'No pudimos copiar', type: 'error' });
    }
  };

  if (loading) return <PageLoader />;

  const basePath = `${API_BASE}/api/v1/${slug ?? ''}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mi Tienda</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Conectá tu propio ecommerce a la API pública de GoShopping.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600" data-testid="info-load-error">
          {error}
        </p>
      )}

      {/* Conexión */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Conexión</h2>

        <div className="text-xs text-gray-600 space-y-1.5">
          <div>
            <span className="block uppercase tracking-wider text-[11px] text-gray-400">Slug</span>
            <code
              className="text-sm font-mono text-brand-700"
              data-testid="store-slug"
            >
              {slug}
            </code>
          </div>
          <div>
            <span className="block uppercase tracking-wider text-[11px] text-gray-400">
              URL base de la API
            </span>
            <div className="flex items-center gap-2">
              <code
                className="text-sm font-mono break-all"
                data-testid="api-base-url"
              >
                {basePath}
              </code>
              <button
                type="button"
                onClick={() => copyText(basePath)}
                aria-label="Copiar URL base"
                className="shrink-0 p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-600">
          <span className="block uppercase tracking-wider text-[11px] text-gray-400 mb-1.5">
            Endpoints disponibles
          </span>
          <ul className="space-y-1 font-mono">
            {V1_ENDPOINTS.map(({ method, path }) => (
              <li key={`${method} ${path}`} className="flex items-center gap-2">
                <span className="inline-flex w-12 justify-center rounded bg-brand-50 text-brand-700 font-semibold">
                  {method}
                </span>
                <span>{path}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-gray-600">
          <span className="block uppercase tracking-wider text-[11px] text-gray-400 mb-1.5">
            Ejemplo de autorización
          </span>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-[12px] overflow-x-auto">
{`curl "${API_BASE}/api/v1/${slug ?? ''}/config" \\
  -H "Authorization: Bearer <tu_api_key>"`}
          </pre>
        </div>
      </section>

      {/* API keys */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">API keys</h2>
        </div>

        {newPlaintext && (
          <div
            className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3"
            data-testid="new-key-plaintext-wrap"
          >
            <p className="text-xs text-amber-800">
              Guardá esta clave ahora: no podrás volver a verla.
            </p>
            <code
              className="block text-sm font-mono break-all text-amber-900"
              data-testid="new-key-plaintext"
            >
              {newPlaintext}
            </code>
            <button
              type="button"
              onClick={() => setNewPlaintext(null)}
              className="text-xs font-medium text-amber-900 underline"
            >
              Entendido
            </button>
          </div>
        )}

        {keys.length === 0 && !newPlaintext ? (
          <p className="text-xs text-gray-500">Todavía no tenés API keys.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {keys.map((key) => (
              <li key={key.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{key.name}</p>
                  <p className="text-xs font-mono text-gray-500">{key.prefix}…</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(key.id)}
                  aria-label={`Revocar ${key.name}`}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2 pt-1">
          <KeyRound className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="text"
            aria-label="Nombre de la clave"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre (ej. Mi tienda online)"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-700 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear clave
          </button>
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
