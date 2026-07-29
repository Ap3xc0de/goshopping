'use client';

import { useState } from 'react';
import { useStore } from '@/lib/hooks/useStore';
import { useFetch } from '@/lib/hooks/useFetch';
import { api } from '@/lib/api';
import { SalesBarChart } from '@/components/charts/SalesBarChart';
import { TopProductsChart } from '@/components/charts/TopProductsChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SalesReport, ProductReport, CustomerReport } from '@/lib/types';

const TABS = ['Ventas', 'Productos', 'Clientes'] as const;
type Tab = typeof TABS[number];

function DateRangePicker({
  from, to, onFrom, onTo,
}: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input type="date" value={from} onChange={(e) => onFrom(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
      <span className="text-gray-400">—</span>
      <input type="date" value={to} onChange={(e) => onTo(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
    </div>
  );
}

export default function ReportsPage() {
  const { storeId } = useStore();
  const [tab, setTab] = useState<Tab>('Ventas');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const params = { period: 'custom' as const, start_date: from, end_date: to };

  const { data: salesData, loading: salesLoading } = useFetch<SalesReport>(
    () => storeId ? api.getSalesReport(storeId, params) : Promise.resolve({} as SalesReport),
    [storeId, from, to],
  );

  const { data: productsData, loading: productsLoading } = useFetch<ProductReport>(
    () => storeId ? api.getProductsReport(storeId, params) : Promise.resolve({} as ProductReport),
    [storeId, from, to],
  );

  const { data: customersData, loading: customersLoading } = useFetch<CustomerReport>(
    () => storeId ? api.getCustomersReport(storeId, params) : Promise.resolve({} as CustomerReport),
    [storeId, from, to],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analiza el desempeño de tu tienda</p>
        </div>
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Sales tab */}
      {tab === 'Ventas' && (
        <div className="space-y-5">
          {salesLoading ? <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Ingresos totales', value: formatCurrency(salesData?.total_revenue ?? 0) },
                  { label: 'Total pedidos', value: String(salesData?.total_orders ?? 0) },
                  { label: 'Ticket promedio', value: formatCurrency(salesData?.avg_order_value ?? 0) },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
              {salesData?.by_day && salesData.by_day.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas por día</h2>
                  <SalesBarChart data={salesData.by_day} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Products tab */}
      {tab === 'Productos' && (
        <div className="space-y-5">
          {productsLoading ? <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div> : (
            productsData?.top_products && productsData.top_products.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Productos más vendidos</h2>
                <TopProductsChart data={productsData.top_products} />
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-16">Sin datos para el período seleccionado</p>
            )
          )}
        </div>
      )}

      {/* Customers tab */}
      {tab === 'Clientes' && (
        <div className="space-y-5">
          {customersLoading ? <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Top clientes', value: String(customersData?.top_customers?.length ?? 0) },
                  { label: 'LTV promedio', value: formatCurrency(customersData?.top_customers?.[0]?.avg_order_value ?? 0) },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
              {customersData?.top_customers && customersData.top_customers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-5 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">Top clientes</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Cliente', 'Pedidos', 'Total'].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customersData.top_customers.map((c) => (
                        <tr key={c.customer_id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3 font-medium text-gray-800">{c.customer_name}</td>
                          <td className="px-5 py-3 text-gray-700 text-center">{c.orders_count}</td>
                          <td className="px-5 py-3 font-medium text-gray-900">{formatCurrency(c.total_spent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
