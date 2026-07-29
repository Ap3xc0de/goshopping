'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Order } from '@/lib/types';

interface OrdersTableProps {
  orders: Order[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function OrdersTable({ orders, page, totalPages, onPageChange }: OrdersTableProps) {
  if (orders.length === 0) {
    return <EmptyState title="Sin pedidos" description="No hay pedidos para los filtros seleccionados." />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Pedido', 'Cliente', 'Estado', 'Total', 'Fecha'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/orders/${order.id}`} className="text-brand-600 hover:underline">
                    #{order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{order.customer_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                  {formatCurrency(order.total)}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDateTime(order.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
