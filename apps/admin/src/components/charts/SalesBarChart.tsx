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
import { formatCurrency } from '@/lib/utils';

interface DataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface SalesBarChartProps {
  data: DataPoint[];
}

export function SalesBarChart({ data }: SalesBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => {
            try {
              return new Date(v).toLocaleDateString('es-CO', { weekday: 'short' });
            } catch {
              return v;
            }
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Ventas']}
          labelFormatter={(label) => {
            try {
              return new Date(String(label)).toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              });
            } catch {
              return label;
            }
          }}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Bar dataKey="revenue" fill="#2E7D32" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
