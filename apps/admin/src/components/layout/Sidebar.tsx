'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useStore } from '@/lib/hooks/useStore';

const navItems = [
  { href: '/dashboard',                  label: 'Dashboard',      Icon: LayoutDashboard },
  { href: '/dashboard/orders',           label: 'Pedidos',        Icon: ShoppingBag },
  { href: '/dashboard/products',         label: 'Productos',      Icon: Package },
  { href: '/dashboard/customers',        label: 'Clientes',       Icon: Users },
  { href: '/dashboard/reports',          label: 'Reportes',       Icon: BarChart3 },
  { href: '/dashboard/create-store',     label: 'Crear Tienda',   Icon: Sparkles },
  { href: '/dashboard/settings',         label: 'Configuración',  Icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { storeName } = useStore();

  return (
    <aside
      className={classNames(
        'flex flex-col bg-brand-700 text-white transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-brand-600 min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingCart className="h-6 w-6 text-white shrink-0" />
            <span className="font-bold text-sm tracking-wide truncate">Go Shopping</span>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="p-1.5 rounded hover:bg-white/10 transition-colors ml-auto shrink-0"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Store name */}
      {!collapsed && storeName && (
        <div className="px-4 py-2.5 bg-brand-600/60 border-b border-brand-600">
          <p className="text-xs text-white/60 uppercase tracking-wider mb-0.5">Tienda</p>
          <p className="text-sm font-semibold text-white truncate">{storeName}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={classNames(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-brand-600 text-xs text-white/40 text-center">
          Panel del Vendedor v1.0
        </div>
      )}
    </aside>
  );
}
