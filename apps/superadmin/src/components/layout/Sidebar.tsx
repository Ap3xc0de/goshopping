'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Store,
  Link2,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react';
import { classNames } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',             label: 'Dashboard',      Icon: LayoutDashboard },
  { href: '/dashboard/accounts',    label: 'Cuentas',        Icon: Users },
  { href: '/dashboard/stores',      label: 'Tiendas',        Icon: Store },
  { href: '/dashboard/integrations',label: 'Integraciones',  Icon: Link2 },
  { href: '/dashboard/audit-log',   label: 'Auditoría',      Icon: ClipboardList },
  { href: '/dashboard/settings',    label: 'Configuración',  Icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={classNames(
        'flex flex-col bg-brand-600 text-white transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-brand-700 min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-white" />
            <span className="font-bold text-base tracking-wide">Go Shopping</span>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="p-1.5 rounded hover:bg-brand-700 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
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

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-brand-700 text-xs text-white/40 text-center">
          SuperAdmin Panel v1.0
        </div>
      )}
    </aside>
  );
}
