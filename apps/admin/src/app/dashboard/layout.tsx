'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/ui/LoadingSpinner';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { account, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !account) {
      router.replace('/login');
    }
  }, [account, loading, router]);

  if (loading) return <PageLoader />;
  if (!account) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/products', label: 'Productos', icon: '📦' },
  { href: '/dashboard/orders', label: 'Pedidos', icon: '🛒' },
  { href: '/dashboard/customers', label: 'Clientes', icon: '👤' },
  { href: '/dashboard/integrations', label: 'Integraciones', icon: '🔗' },
  { href: '/dashboard/settings', label: 'Configuración', icon: '⚙️' },
];

