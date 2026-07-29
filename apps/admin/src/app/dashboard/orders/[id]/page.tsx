'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/hooks/useStore';
import { useOrder } from '@/lib/hooks/useOrders';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderStatusActions } from '@/components/orders/OrderStatusActions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { storeId } = useStore();
  const { data: order, loading, error, refetch } = useOrder(id);

  if (loading) return <PageLoader />;
  if (error || !order) return <EmptyState title="Pedido no encontrado" description="Este pedido no existe o no tienes acceso." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pedido #{order.order_number}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Actions */}
      {storeId && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Acciones</h2>
          <OrderStatusActions order={order} storeId={storeId} onUpdated={refetch} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Cliente</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nombre</dt>
              <dd className="font-medium text-gray-900">{order.customer_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-700">{order.customer_email}</dd>
            </div>
            {order.customer_phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Teléfono</dt>
                <dd className="text-gray-700">{order.customer_phone}</dd>
              </div>
            )}
            {order.customer_address && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 shrink-0">Dirección</dt>
                <dd className="text-gray-700 text-right">{order.customer_address}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Resumen</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="text-gray-700">{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">IVA (19%)</dt>
              <dd className="text-gray-700">{formatCurrency(order.tax)}</dd>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-100 pt-2 mt-2">
              <dt className="text-gray-800">Total</dt>
              <dd className="text-gray-900">{formatCurrency(order.total)}</dd>
            </div>
          </dl>
          {order.tracking_number && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
              <span className="text-gray-500">Tracking: </span>
              <span className="font-medium text-brand-700">{order.tracking_number}</span>
            </div>
          )}
          {order.notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Notas</p>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Productos</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Producto', 'Precio', 'Cantidad', 'Total'].map((h) => (
                <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {order.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2.5 font-medium text-gray-800">{item.product_name}</td>
                <td className="py-2.5 text-gray-700">{formatCurrency(item.unit_price)}</td>
                <td className="py-2.5 text-gray-700">{item.quantity}</td>
                <td className="py-2.5 font-medium text-gray-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline */}
      {order.timeline && order.timeline.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Historial del pedido</h2>
          <OrderTimeline timeline={order.timeline} />
        </div>
      )}
    </div>
  );
}
