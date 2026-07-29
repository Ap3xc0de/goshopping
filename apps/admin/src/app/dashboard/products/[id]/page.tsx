'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/hooks/useStore';
import { useProduct, useProductActions } from '@/lib/hooks/useProducts';
import { api } from '@/lib/api';
import { ProductForm } from '@/components/products/ProductForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Product } from '@/lib/types';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { storeId } = useStore();
  const { data: product, loading, error } = useProduct(id);
  const { update, remove } = useProductActions();
  const [deleteModal, setDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (loading) return <PageLoader />;
  if (error || !product) return <EmptyState title="Producto no encontrado" />;

  async function handleUpdate(data: Partial<Product>) {
    if (!storeId) return 'Sin tienda seleccionada';
    const err = await update(storeId, id, data);
    if (!err) setToast({ message: 'Producto actualizado', type: 'success' });
    return err;
  }

  async function handleUploadImages(files: File[]): Promise<string | null> {
    if (!storeId) return 'Sin tienda seleccionada';
    try {
      await api.uploadProductImages(storeId, id, files);
      setToast({ message: 'Imágenes subidas correctamente', type: 'success' });
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Error al subir imágenes';
    }
  }

  async function handleDelete() {
    setDeleteModal(false);
    if (!storeId) return;
    const err = await remove(storeId, id);
    if (err) {
      setToast({ message: err, type: 'error' });
    } else {
      router.push('/dashboard/products');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/products" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 truncate">{product.name}</h1>
        </div>
        <button
          onClick={() => setDeleteModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <ProductForm initial={product} submitLabel="Guardar cambios" onSubmit={handleUpdate} onUploadImages={handleUploadImages} />
      </div>

      <ConfirmDialog
        open={deleteModal}
        title="Eliminar producto"
        message={`¿Estás seguro de eliminar "${product.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(false)}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
