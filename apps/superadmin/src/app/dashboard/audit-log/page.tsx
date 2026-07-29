'use client';

import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAuditLog } from '@/lib/hooks/useAuditLog';
import { formatDateTime } from '@/lib/utils';

export default function AuditLogPage() {
  const { data, loading, error, filters, updateFilters } = useAuditLog();

  if (loading) return <PageLoader />;
  if (error) return <EmptyState title="Error al cargar auditoría" description={error} />;

  const entries = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Registro de auditoría</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} entradas</span>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={filters.resource_type ?? ''}
            onChange={(v) => updateFilters({ resource_type: v || undefined })}
            placeholder="Filtrar por recurso…"
          />
        </div>
        <DateRangePicker
          from={filters.date_from ?? ''}
          to={filters.date_to ?? ''}
          onFromChange={(v) => updateFilters({ date_from: v || undefined })}
          onToChange={(v) => updateFilters({ date_to: v || undefined })}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState title="Sin registros" description="No hay entradas de auditoría para el filtro seleccionado." />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: 'created_at',
                header: 'Fecha',
                render: (row) => formatDateTime(row.created_at),
              },
              { key: 'actor_name', header: 'Actor' },
              { key: 'action', header: 'Acción' },
              { key: 'resource_type', header: 'Recurso' },
              { key: 'resource_id', header: 'ID recurso', className: 'font-mono text-xs' },
              { key: 'ip_address', header: 'IP', className: 'font-mono text-xs' },
            ]}
            data={entries}
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
