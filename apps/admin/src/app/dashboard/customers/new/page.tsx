'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/hooks/useStore';
import { useCustomerActions } from '@/lib/hooks/useCustomers';
import { CustomerForm } from '@/components/customers/CustomerForm';
import type { Customer } from '@/lib/types';

export default function NewCustomerPage() {
  const router = useRouter();
  const { storeId } = useStore();
  const { create } = useCustomerActions();

  async function handleSubmit(data: Partial<Customer>): Promise<string | null> {
    if (!storeId) return 'Sin tienda seleccionada';
    return create(storeId, data);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/customers" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <CustomerForm
          submitLabel="Crear cliente"
          onSubmit={handleSubmit}
          onSuccess={() => router.push('/dashboard/customers')}
        />
      </div>
    </div>
  );
}
