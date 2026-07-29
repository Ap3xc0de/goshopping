import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Customer } from '@/lib/types';

interface CustomersTableProps {
  customers: Customer[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function CustomersTable({ customers, page, totalPages, onPageChange }: CustomersTableProps) {
  if (customers.length === 0) {
    return <EmptyState title="Sin clientes" description="Aún no tienes clientes registrados." />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Cliente', 'Email', 'Pedidos', 'Total gastado', 'Desde'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/customers/${c.id}`} className="text-brand-600 hover:underline">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-700">{c.orders_count ?? 0}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(c.total_spent ?? 0)}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
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
