'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAccounts } from '@/lib/hooks/useAccounts';
import { accountStatusColor, formatDate } from '@/lib/utils';
import type { Account } from '@/lib/types';

export default function AccountsPage() {
  const router = useRouter();
  const { data, loading, error, filters, updateFilters } = useAccounts();

  if (loading) return <PageLoader />;
  if (error) return <EmptyState title="Error al cargar cuentas" description={error} />;

  const accounts = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cuentas</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} en total</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <SearchInput
            value={filters.search ?? ''}
            onChange={(v) => updateFilters({ search: v })}
            placeholder="Buscar por nombre o email…"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilters({ status: e.target.value as Account['status'] || undefined })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="suspended">Suspendido</option>
          <option value="pending">Pendiente</option>
        </select>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="Sin resultados" description="No se encontraron cuentas con ese criterio." />
      ) : (
        <>
          <DataTable
            columns={[
              { key: 'name', header: 'Nombre' },
              { key: 'email', header: 'Email' },
              { key: 'role', header: 'Rol' },
              {
                key: 'status',
                header: 'Estado',
                render: (row) => (
                  <StatusBadge label={row.status} variant={accountStatusColor(row.status)} />
                ),
              },
              { key: 'stores_count', header: 'Tiendas' },
              {
                key: 'created_at',
                header: 'Creado',
                render: (row) => formatDate(row.created_at),
              },
            ]}
            data={accounts}
            onRowClick={(row) => router.push(`/dashboard/accounts/${row.id}`)}
          />
          <Pagination
            page={filters.page ?? 1}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
          />
        </>
      )}
    </div>
  );
}
