'use client';

import { Users, Store, ShoppingBag, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/ui/StatsCard';
import { SalesChart } from '@/components/charts/SalesChart';
import { DataTable } from '@/components/ui/DataTable';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDashboard } from '@/lib/hooks/useDashboard';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  const { metrics, loading, error } = useDashboard();

  if (loading) return <PageLoader />;
  if (error) return <EmptyState title="No se pudo cargar el dashboard" description={error} />;
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Cuentas totales" value={formatNumber(metrics.total_accounts)} subtitle={`${formatNumber(metrics.active_accounts)} activas`} icon={<Users className="h-6 w-6" />} />
        <StatsCard title="Tiendas activas" value={formatNumber(metrics.active_stores)} subtitle={`${formatNumber(metrics.total_stores)} en total`} icon={<Store className="h-6 w-6" />} />
        <StatsCard title="Pedidos hoy" value={formatNumber(metrics.total_orders_today)} icon={<ShoppingBag className="h-6 w-6" />} />
        <StatsCard title="Ingresos del mes" value={formatCurrency(metrics.revenue_month)} subtitle={`Hoy: ${formatCurrency(metrics.revenue_today)}`} icon={<TrendingUp className="h-6 w-6" />} />
      </div>

      {metrics.sales_by_day?.length > 0 && <SalesChart data={metrics.sales_by_day} />}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Top tiendas</h2>
        <DataTable
          columns={[
            { key: 'store_name', header: 'Tienda' },
            { key: 'orders', header: 'Pedidos', render: (row) => formatNumber(row.orders) },
            { key: 'revenue', header: 'Ingresos', render: (row) => formatCurrency(row.revenue) },
          ]}
          data={(metrics.top_stores ?? []).map((s) => ({ ...s, id: s.store_id }))}
        />
      </div>
    </div>
  );
}
