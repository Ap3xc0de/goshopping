'use client';

import { ShoppingBag, TrendingUp, AlertTriangle, Package } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/hooks/useStore';
import { useDashboard } from '@/lib/hooks/useDashboard';
import { StatsCard } from '@/components/ui/StatsCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SalesBarChart } from '@/components/charts/SalesBarChart';
import { formatCurrency } from '@/lib/utils';
import type { DashboardMetrics } from '@/lib/types';

function percentChange(current: number, previous: number) {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% vs mes anterior`;
}

export default function DashboardPage() {
  const { storeId } = useStore();
  const { data, loading, error } = useDashboard();

  if (!storeId || loading) return <PageLoader />;

  if (error) {
    return (
      <EmptyState
        title="No se pudo cargar el dashboard"
        description="Verifica tu conexión o contacta soporte."
      />
    );
  }

  const metrics = data as DashboardMetrics | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen de tu tienda en tiempo real</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Ventas Hoy"
          value={formatCurrency(metrics?.sales_today ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatsCard
          title="Ventas del Mes"
          value={formatCurrency(metrics?.sales_month ?? 0)}
          subtitle={
            metrics
              ? (percentChange(metrics.sales_month, metrics.sales_prev_month) ?? undefined)
              : undefined
          }
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatsCard
          title="Pedidos Pendientes"
          value={String(metrics?.pending_orders ?? 0)}
          alert={(metrics?.pending_orders ?? 0) > 5}
          subtitle={(metrics?.pending_orders ?? 0) > 5 ? 'Requieren atención' : undefined}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatsCard
          title="Productos Bajo Stock"
          value={String(metrics?.low_stock_count ?? 0)}
          alert={(metrics?.low_stock_count ?? 0) > 0}
          subtitle={(metrics?.low_stock_count ?? 0) > 0 ? 'Reabastecer pronto' : undefined}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Chart + Recent Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas últimos 7 días</h2>
          {metrics?.sales_by_day && metrics.sales_by_day.length > 0 ? (
            <SalesBarChart data={metrics.sales_by_day} />
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
              Sin datos de ventas aún
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Últimos pedidos</h2>
            <Link href="/dashboard/orders" className="text-xs text-brand-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {metrics?.recent_orders && metrics.recent_orders.length > 0 ? (
            <ul className="space-y-3">
              {metrics.recent_orders.map((order) => (
                <li key={order.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-sm font-medium text-gray-800 hover:text-brand-600 truncate block"
                    >
                      #{order.order_number}
                    </Link>
                    <p className="text-xs text-gray-400 truncate">{order.customer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={order.status} />
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(order.total)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Sin pedidos recientes</p>
          )}
        </div>
      </div>

      {/* Low stock alerts */}
      {metrics?.low_stock_products && metrics.low_stock_products.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-orange-700">Alertas de stock bajo</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.low_stock_products.map((product) => (
              <Link
                key={product.id}
                href={`/dashboard/products/${product.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-orange-100 hover:border-orange-300 transition-colors"
              >
                <Package className="h-8 w-8 text-orange-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Stock: {product.stock} / mín: {product.min_stock}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

