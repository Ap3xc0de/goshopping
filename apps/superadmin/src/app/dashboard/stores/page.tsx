'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStores } from '@/lib/hooks/useStores';
import { storeStatusColor, formatCurrency, formatDate } from '@/lib/utils';
import type { Store } from '@/lib/types';

export default function StoresPage() {
  const router = useRouter();
  const { data, loading, error, filters, updateFilters } = useStores();

  if (loading) return <PageLoader />;
  if (error) return <EmptyState title="Error al cargar tiendas" description={error} />;

  const stores = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tiendas</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} en total</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <SearchInput
            value={filters.search ?? ''}
            onChange={(v) => updateFilters({ search: v })}
            placeholder="Buscar por nombre o slug…"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilters({ status: e.target.value as Store['status'] || undefined })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
          <option value="suspended">Suspendida</option>
        </select>
      </div>

      {stores.length === 0 ? (
        <EmptyState title="Sin resultados" description="No se encontraron tiendas." />
      ) : (
        <>
          <DataTable
            columns={[
              { key: 'name', header: 'Nombre' },
              { key: 'slug', header: 'Slug' },
              { key: 'owner_name', header: 'Propietario' },
              {
                key: 'status',
                header: 'Estado',
                render: (row) => <StatusBadge label={row.status} variant={storeStatusColor(row.status)} />,
              },
              { key: 'orders_count', header: 'Pedidos' },
              {
                key: 'revenue',
                header: 'Ingresos',
                render: (row) => formatCurrency(row.revenue),
              },
              {
                key: 'created_at',
                header: 'Creada',
                render: (row) => formatDate(row.created_at),
              },
            ]}
            data={stores}
            onRowClick={(row) => router.push(`/dashboard/stores/${row.id}`)}
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
