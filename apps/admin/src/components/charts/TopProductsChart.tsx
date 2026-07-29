'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface TopProduct {
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

interface TopProductsChartProps {
  data: TopProduct[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const chartData = data.slice(0, 10).map((p) => ({
    name: p.product_name.length > 20 ? p.product_name.slice(0, 20) + '…' : p.product_name,
    cantidad: p.quantity_sold,
    revenue: p.revenue,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
      <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
          tickFormatter={(v: number) => formatNumber(v)} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value) => [formatNumber(Number(value)), 'Unidades']}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Bar dataKey="cantidad" fill="#2E7D32" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
