'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Toast } from '@/components/ui/Toast';

const TABS = ['Datos de la tienda', 'Seguridad', 'Notificaciones'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const { account } = useAuth();
  const [tab, setTab] = useState<Tab>('Datos de la tienda');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Administra tu cuenta y preferencias</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Store data */}
      {tab === 'Datos de la tienda' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Información de la cuenta</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <dt className="text-gray-500">Nombre</dt>
              <dd className="font-medium text-gray-900">{account?.name}</dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-700">{account?.email}</dd>
            </div>
            <div className="flex justify-between items-center py-2">
              <dt className="text-gray-500">Rol</dt>
              <dd>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-brand-100 text-brand-800 capitalize">
                  {account?.role}
                </span>
              </dd>
            </div>
          </dl>
          <p className="text-xs text-gray-400">Para cambiar datos de la cuenta, contacta al administrador.</p>
        </div>
      )}

      {/* Security */}
      {tab === 'Seguridad' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Cambiar contraseña</h2>
          <p className="text-sm text-gray-500">
            El cambio de contraseña estará disponible próximamente. Si necesitas restablecer tu contraseña, contacta al soporte.
          </p>
        </div>
      )}

      {/* Notifications */}
      {tab === 'Notificaciones' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Preferencias de notificaciones</h2>
          <p className="text-sm text-gray-500">
            La configuración de notificaciones estará disponible próximamente.
          </p>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
