'use client';

import { useState, type FormEvent } from 'react';
import type { Customer } from '@/lib/types';

interface CustomerFormProps {
  initial?: Partial<Customer>;
  onSubmit: (data: Partial<Customer>) => Promise<string | null>;
  onSuccess?: () => void;
  submitLabel?: string;
}

const EMPTY: Partial<Customer> = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

export function CustomerForm({
  initial = EMPTY,
  onSubmit,
  onSuccess,
  submitLabel = 'Guardar',
}: CustomerFormProps) {
  const [form, setForm] = useState<Partial<Customer>>({ ...EMPTY, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof Customer>(k: K, v: Customer[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await onSubmit(form);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
          <input
            required
            value={form.name ?? ''}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Juan García"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => set('email', e.target.value)}
            placeholder="correo@ejemplo.com"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            type="tel"
            value={form.phone ?? ''}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="Ej: 300 123 4567"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            value={form.address ?? ''}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Calle, ciudad, departamento"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 flex items-center gap-2"
      >
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {loading ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}
