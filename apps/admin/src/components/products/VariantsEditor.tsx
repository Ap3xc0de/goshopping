'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { CreateVariantRequest, ProductVariant, UpdateVariantRequest } from '@/lib/types';

interface VariantsEditorProps {
  storeId: string;
  productId: string;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

type VariantFormState = {
  sku: string;
  size: string;
  color: string;
  price_override: number | null;
  stock: number;
  status: string;
};

const EMPTY_FORM: VariantFormState = {
  sku: '',
  size: '',
  color: '',
  price_override: null,
  stock: 0,
  status: 'active',
};

export function VariantsEditor({ storeId, productId, onError, onSuccess }: VariantsEditorProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [form, setForm] = useState<VariantFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listVariants(storeId, productId);
      setVariants(res.variants);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'No pudimos cargar las variantes');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, productId]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(variant: ProductVariant) {
    setEditing(variant);
    setForm({
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      price_override: variant.price_override,
      stock: variant.stock,
      status: variant.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload: UpdateVariantRequest = { ...form };
        const updated = await api.updateVariant(storeId, productId, editing.id, payload);
        setVariants((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
        onSuccess?.('Variante actualizada');
      } else {
        const payload: CreateVariantRequest = { ...form };
        const created = await api.createVariant(storeId, productId, payload);
        setVariants((vs) => [...vs, created]);
        onSuccess?.('Variante creada');
      }
      setModalOpen(false);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'No pudimos guardar la variante');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.deleteVariant(storeId, productId, target.id);
      setVariants((vs) => vs.filter((v) => v.id !== target.id));
      onSuccess?.('Variante eliminada');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'No pudimos eliminar la variante');
    }
  }

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Variantes</h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar variante
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="text-xs text-gray-500">Este producto no tiene variantes.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
              <th className="pb-2">SKU</th>
              <th className="pb-2">Talla</th>
              <th className="pb-2">Color</th>
              <th className="pb-2">Precio</th>
              <th className="pb-2">Stock</th>
              <th className="pb-2">Estado</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {variants.map((v) => (
              <tr key={v.id}>
                <td className="py-2 font-mono">{v.sku}</td>
                <td className="py-2">{v.size || '—'}</td>
                <td className="py-2">{v.color || '—'}</td>
                <td className="py-2">{v.price_override != null ? v.price_override : '—'}</td>
                <td className="py-2">{v.stock}</td>
                <td className="py-2">{v.status === 'active' ? 'Activo' : 'Inactivo'}</td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    aria-label={`Editar ${v.sku}`}
                    onClick={() => openEdit(v)}
                    className="p-1 text-gray-400 hover:text-brand-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${v.sku}`}
                    onClick={() => setDeleteTarget(v)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar variante' : 'Nueva variante'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="variant-sku" className="block text-xs font-medium text-gray-700 mb-1">
              SKU *
            </label>
            <input
              id="variant-sku"
              required
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="variant-size" className="block text-xs font-medium text-gray-700 mb-1">
                Talla
              </label>
              <input
                id="variant-size"
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div>
              <label htmlFor="variant-color" className="block text-xs font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                id="variant-color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="variant-price" className="block text-xs font-medium text-gray-700 mb-1">
                Precio (vacío = precio base)
              </label>
              <input
                id="variant-price"
                type="number"
                min="0"
                value={form.price_override ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    price_override: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div>
              <label htmlFor="variant-stock" className="block text-xs font-medium text-gray-700 mb-1">
                Stock
              </label>
              <input
                id="variant-stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>
          <div>
            <label htmlFor="variant-status" className="block text-xs font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="variant-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar variante"
        message={
          deleteTarget
            ? `¿Eliminar la variante "${deleteTarget.sku}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
