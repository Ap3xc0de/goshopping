'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStore } from '@/lib/hooks/useStores';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { storeStatusColor, formatCurrency, formatNumber, formatDateTime } from '@/lib/utils';
import type { StoreStatus } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default function StoreDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { store, loading, error, refetch } = useStore(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading) return <PageLoader />;
  if (error || !store) return <EmptyState title="Tienda no encontrada" description={error ?? ''} />;

  const targetStatus: StoreStatus = store.status === 'active' ? 'suspended' : 'active';

  async function handleStatusChange() {
    setSaving(true);
    try {
      await api.updateStore(id, { status: targetStatus });
      toast(`Tienda ${targetStatus === 'active' ? 'activada' : 'suspendida'} correctamente`, 'success');
      setConfirmOpen(false);
      refetch();
    } catch (e: unknown) {
      toast((e as Error).message ?? 'Error al actualizar', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
            <p className="text-gray-400 text-sm font-mono">/{store.slug}</p>
          </div>
          <StatusBadge label={store.status} variant={storeStatusColor(store.status)} />
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Propietario</dt>
            <dd className="font-medium text-gray-900">{store.owner_name ?? store.owner_id}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Productos</dt>
            <dd className="font-medium text-gray-900">{formatNumber(store.products_count)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Pedidos</dt>
            <dd className="font-medium text-gray-900">{formatNumber(store.orders_count)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ingresos</dt>
            <dd className="font-medium text-gray-900">{formatCurrency(store.revenue)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Creada</dt>
            <dd className="font-medium text-gray-900">{formatDateTime(store.created_at)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Actualizada</dt>
            <dd className="font-medium text-gray-900">{formatDateTime(store.updated_at)}</dd>
          </div>
        </dl>

        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setConfirmOpen(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
              store.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {store.status === 'active' ? 'Suspender tienda' : 'Activar tienda'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleStatusChange}
        loading={saving}
        danger={store.status === 'active'}
        title={store.status === 'active' ? 'Suspender tienda' : 'Activar tienda'}
        message={`¿Estás seguro de que deseas ${
          store.status === 'active' ? 'suspender' : 'activar'
        } la tienda "${store.name}"?`}
        confirmLabel={store.status === 'active' ? 'Suspender' : 'Activar'}
      />
    </div>
  );
}
