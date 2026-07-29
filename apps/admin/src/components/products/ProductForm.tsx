'use client';

import { useState, useRef, type FormEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { Product } from '@/lib/types';

interface ProductFormProps {
  initial?: Partial<Product>;
  onSubmit: (data: Partial<Product>) => Promise<string | null>;
  onUploadImages?: (files: File[]) => Promise<string | null>;
  onSuccess?: () => void;
  submitLabel?: string;
}

const EMPTY: Partial<Product> = {
  name: '',
  sku: '',
  price: 0,
  cost: 0,
  stock: 0,
  min_stock: 0,
  category: '',
  status: 'active',
  images: [],
};

export function ProductForm({
  initial = EMPTY,
  onSubmit,
  onUploadImages,
  onSuccess,
  submitLabel = 'Guardar',
}: ProductFormProps) {
  const [form, setForm] = useState<Partial<Product>>({ ...EMPTY, ...initial });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function removeExistingImage(url: string) {
    setForm((p) => ({ ...p, images: (p.images ?? []).filter((i) => i !== url) }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const previews = files.map((f) => URL.createObjectURL(f));
    setPendingFiles((prev) => [...prev, ...files]);
    setPendingPreviews((prev) => [...prev, ...previews]);
    e.target.value = '';
  }

  function removePending(index: number) {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
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

    if (pendingFiles.length > 0 && onUploadImages) {
      const uploadErr = await onUploadImages(pendingFiles);
      if (uploadErr) {
        setError(uploadErr);
        setLoading(false);
        return;
      }
      setPendingFiles([]);
      setPendingPreviews([]);
    }

    setLoading(false);
    onSuccess?.();
  }

  const existingImages = form.images ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
        <div className="flex flex-wrap gap-3">
          {existingImages.map((url) => (
            <div key={url} className="relative group w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeExistingImage(url)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {pendingPreviews.map((url, i) => (
            <div key={`pending-${i}`} className="relative group w-24 h-24 rounded-lg border-2 border-dashed border-brand-400 overflow-hidden bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePending(i)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 bg-brand-600/80 text-white text-[10px] text-center py-0.5">
                Por subir
              </span>
            </div>
          ))}
          {onUploadImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-xs">Agregar</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        {pendingFiles.length > 0 && (
          <p className="mt-1.5 text-xs text-brand-600">
            {pendingFiles.length} imagen(es) se subirán al guardar
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
          <input required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input value={form.sku ?? ''} onChange={(e) => set('sku', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <input value={form.category ?? ''} onChange={(e) => set('category', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta *</label>
          <input required type="number" min="0" step="1" value={form.price ?? 0}
            onChange={(e) => set('price', Number(e.target.value))}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
          <input type="number" min="0" step="1" value={form.cost ?? 0}
            onChange={(e) => set('cost', Number(e.target.value))}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual *</label>
          <input required type="number" min="0" step="1" value={form.stock ?? 0}
            onChange={(e) => set('stock', Number(e.target.value))}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
          <input type="number" min="0" step="1" value={form.min_stock ?? 0}
            onChange={(e) => set('min_stock', Number(e.target.value))}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value as Product['status'])}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 flex items-center gap-2">
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {loading ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}
