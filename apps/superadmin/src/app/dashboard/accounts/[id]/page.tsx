'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAccount } from '@/lib/hooks/useAccounts';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { accountStatusColor, formatDateTime } from '@/lib/utils';
import type { AccountStatus } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default function AccountDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { account, loading, error, refetch } = useAccount(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading) return <PageLoader />;
  if (error || !account) return <EmptyState title="Cuenta no encontrada" description={error ?? ''} />;

  const targetStatus: AccountStatus = account.status === 'active' ? 'suspended' : 'active';

  async function handleStatusChange() {
    setSaving(true);
    try {
      await api.updateAccount(id, { status: targetStatus });
      toast(`Cuenta ${targetStatus === 'active' ? 'activada' : 'suspendida'} correctamente`, 'success');
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
            <h1 className="text-xl font-bold text-gray-900">{account.name}</h1>
            <p className="text-gray-500 text-sm">{account.email}</p>
          </div>
          <StatusBadge label={account.status} variant={accountStatusColor(account.status)} />
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Rol</dt>
            <dd className="font-medium text-gray-900 capitalize">{account.role}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tiendas</dt>
            <dd className="font-medium text-gray-900">{account.stores_count}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Creado</dt>
            <dd className="font-medium text-gray-900">{formatDateTime(account.created_at)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Actualizado</dt>
            <dd className="font-medium text-gray-900">{formatDateTime(account.updated_at)}</dd>
          </div>
        </dl>

        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setConfirmOpen(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
              account.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {account.status === 'active' ? 'Suspender cuenta' : 'Activar cuenta'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleStatusChange}
        loading={saving}
        danger={account.status === 'active'}
        title={account.status === 'active' ? 'Suspender cuenta' : 'Activar cuenta'}
        message={`¿Estás seguro de que deseas ${
          account.status === 'active' ? 'suspender' : 'activar'
        } la cuenta de ${account.name}?`}
        confirmLabel={account.status === 'active' ? 'Suspender' : 'Activar'}
      />
    </div>
  );
}
