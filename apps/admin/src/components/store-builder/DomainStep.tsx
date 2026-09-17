interface DomainStepProps {
  /**
   * The store's generic hostname (`<slug>.<STOREFRONT_BASE_DOMAIN>`),
   * created atomically alongside the store itself (Slice 3,
   * auth_service.go Register()). `null` while it hasn't loaded yet, or
   * while no read endpoint is wired to fetch it — see the KNOWN GAP note
   * in this slice's apply-progress artifact
   * (sdd/storefront-templates-multidomain/apply-progress).
   */
  hostname: string | null;
  loading?: boolean;
}

/**
 * REQ-ADMIN-04 — read-only. No custom domain input, no verification UI:
 * custom domains are explicitly out of scope for v1 (that's Slice 1/4,
 * ALB + DNS + RESOLVE, not this wizard).
 */
export function DomainStep({ hostname, loading }: DomainStepProps) {
  return (
    <div data-testid="domain-step" className="space-y-3">
      <p className="text-sm font-medium text-gray-900">Dominio de tu tienda</p>

      {loading && (
        <p className="text-sm text-gray-500" data-testid="domain-loading">
          Buscando el dominio de tu tienda...
        </p>
      )}

      {!loading && hostname && (
        <div
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
          data-testid="domain-hostname"
        >
          <span className="text-sm font-mono text-gray-800">{hostname}</span>
        </div>
      )}

      {!loading && !hostname && (
        <p className="text-sm text-gray-500" data-testid="domain-pending">
          Tu tienda ya tiene un dominio asignado automáticamente. Lo vas a ver acá en breve.
        </p>
      )}

      <p className="text-xs text-gray-400">
        Los dominios personalizados van a estar disponibles en una próxima versión.
      </p>
    </div>
  );
}
