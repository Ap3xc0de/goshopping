'use client';

import { useFetch } from '@/lib/hooks/useFetch';
import { api } from '@/lib/api';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { integrationStatusColor, timeAgo } from '@/lib/utils';
import type { Integration } from '@/lib/types';

function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900 capitalize">{integration.name}</h3>
        <StatusBadge label={integration.status} variant={integrationStatusColor(integration.status)} />
      </div>

      {integration.latency_ms !== undefined && (
        <p className="text-sm text-gray-500">
          Latencia: <span className="font-medium text-gray-900">{integration.latency_ms} ms</span>
        </p>
      )}

      <p className="text-xs text-gray-400">
        Verificado {timeAgo(integration.last_checked)}
      </p>

      {integration.error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{integration.error}</p>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const { data: integrations, loading, error } = useFetch<Integration[]>(
    () => api.getIntegrationsHealth(),
  );

  if (loading) return <PageLoader />;
  if (error) return <EmptyState title="Error al cargar integraciones" description={error} />;
  if (!integrations?.length) return <EmptyState title="Sin integraciones" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Estado de integraciones</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.name} integration={integration} />
        ))}
      </div>
    </div>
  );
}
