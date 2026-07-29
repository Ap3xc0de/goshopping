'use client';

import { usePathname } from 'next/navigation';
import { Bell, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useStore } from '@/lib/hooks/useStore';
import Link from 'next/link';

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const labelMap: Record<string, string> = {
    dashboard:  'Dashboard',
    orders:     'Pedidos',
    products:   'Productos',
    customers:  'Clientes',
    reports:    'Reportes',
    settings:   'Configuración',
    new:        'Nuevo',
  };

  return segments.map((seg, i) => ({
    label: labelMap[seg] ?? seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));
}

export function Header() {
  const { account, logout } = useAuth();
  const { storeName } = useStore();
  const breadcrumbs = useBreadcrumbs();
  const initials = account?.name
    ? account.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
            {crumb.isLast ? (
              <span className="font-semibold text-gray-900 truncate">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-gray-500 hover:text-gray-700 shrink-0">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          aria-label="Notificaciones"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold"
            aria-label={`Usuario: ${account?.name ?? ''}`}
          >
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-700 leading-none">{account?.name}</p>
            {storeName && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{storeName}</p>}
          </div>
        </div>

        <button
          onClick={logout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
