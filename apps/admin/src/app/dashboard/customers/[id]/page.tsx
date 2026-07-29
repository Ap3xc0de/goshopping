'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCustomer, useCustomerOrders } from '@/lib/hooks/useCustomers';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: customer, loading, error } = useCustomer(id);
  const { data: ordersData } = useCustomerOrders(id);

  if (loading) return <PageLoader />;
  if (error || !customer) return <EmptyState title="Cliente no encontrado" />;

  const orders = ordersData?.data ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/customers" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-500">{customer.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de pedidos', value: String(customer.orders_count ?? 0) },
          { label: 'Total gastado', value: formatCurrency(customer.total_spent ?? 0) },
          { label: 'Cliente desde', value: formatDate(customer.created_at) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Order history */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historial de pedidos</h2>
        </div>
        {orders.length === 0 ? (
          <EmptyState title="Sin pedidos" description="Este cliente no tiene pedidos aún." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Pedido', 'Estado', 'Total', 'Fecha'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/dashboard/orders/${o.id}`} className="text-brand-600 hover:underline">#{o.order_number}</Link>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 font-medium text-gray-900">{formatCurrency(o.total)}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
