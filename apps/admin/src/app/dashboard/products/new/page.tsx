'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/hooks/useStore';
import { api } from '@/lib/api';
import { ProductForm } from '@/components/products/ProductForm';
import type { Product } from '@/lib/types';

export default function NewProductPage() {
  const router = useRouter();
  const { storeId } = useStore();
  const createdIdRef = useRef<string | null>(null);

  async function handleSubmit(data: Partial<Product>): Promise<string | null> {
    if (!storeId) return 'Sin tienda seleccionada';
    try {
      const product = await api.createProduct(storeId, data);
      createdIdRef.current = product.id;
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Error al crear producto';
    }
  }

  async function handleUploadImages(files: File[]): Promise<string | null> {
    const pid = createdIdRef.current;
    if (!pid || !storeId) return null;
    try {
      await api.uploadProductImages(storeId, pid, files);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Error al subir imágenes';
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/products" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nuevo producto</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <ProductForm
          submitLabel="Crear producto"
          onSubmit={handleSubmit}
          onUploadImages={handleUploadImages}
          onSuccess={() => router.push(`/dashboard/products/${createdIdRef.current ?? ''}`)}
        />
      </div>
    </div>
  );
}
