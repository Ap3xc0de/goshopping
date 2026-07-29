'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useStore } from '@/lib/hooks/useStore';
import { useProducts } from '@/lib/hooks/useProducts';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductCard } from '@/components/products/ProductCard';
import { StockIndicator } from '@/components/products/StockIndicator';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';

type ViewMode = 'grid' | 'table';

export default function ProductsPage() {
  const { storeId } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>('grid');

  const { data, loading } = useProducts({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    per_page: view === 'grid' ? 16 : 20,
  });

  const products = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Administra tu catálogo</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <SearchInput placeholder="Buscar por nombre o SKU…" value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
            <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`} title="Vista cuadrícula"><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setView('table')} className={`p-1.5 rounded ${view === 'table' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`} title="Vista tabla"><List className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : view === 'grid' ? (
            <>
              <ProductGrid products={products} />
              <div className="mt-4">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          ) : (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Producto', 'SKU', 'Precio', 'Stock', 'Estado'].map((h) => (
                      <th key={h} className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="py-3 font-medium">
                        <Link href={`/dashboard/products/${p.id}`} className="text-brand-600 hover:underline">{p.name}</Link>
                      </td>
                      <td className="py-3 text-gray-500">{p.sku ?? '—'}</td>
                      <td className="py-3 font-medium text-gray-900">{formatCurrency(p.price)}</td>
                      <td className="py-3"><StockIndicator stock={p.stock} minStock={p.min_stock} /></td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
