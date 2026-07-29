'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Download } from 'lucide-react';
import { useStore } from '@/lib/hooks/useStore';
import { useOrders } from '@/lib/hooks/useOrders';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { OrderStatus } from '@/lib/types';
import { ORDER_STATUS_LABELS } from '@/lib/utils';

const STATUS_TABS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all',       label: 'Todos' },
  { value: 'pending',   label: ORDER_STATUS_LABELS.pending },
  { value: 'paid',      label: ORDER_STATUS_LABELS.paid },
  { value: 'preparing', label: ORDER_STATUS_LABELS.preparing },
  { value: 'shipped',   label: ORDER_STATUS_LABELS.shipped },
  { value: 'delivered', label: ORDER_STATUS_LABELS.delivered },
  { value: 'cancelled', label: ORDER_STATUS_LABELS.cancelled },
];

export default function OrdersPage() {
  const { storeId } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const filters = {
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    per_page: 20,
  };

  const { data, loading } = useOrders(filters);

  const orders = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  async function handleExport() {
    if (!storeId) return;
    try {
      const blob = await api.exportOrders(storeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail — user sees no export
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona todos los pedidos de tu tienda</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            title="Exportar CSV"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <Link
            href="/dashboard/orders/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo pedido</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <SearchInput
            placeholder="Buscar por número, cliente…"
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
          />
        </div>

        {/* Status tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`shrink-0 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <OrdersTable
            orders={orders}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
