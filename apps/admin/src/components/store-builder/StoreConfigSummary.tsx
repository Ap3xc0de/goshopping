interface PartialStoreConfig {
  name?: string;
  category?: string;
  style?: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
  tagline?: string;
  logo_url?: string | null;
  pages?: string[];
}

const STYLE_LABELS: Record<string, string> = {
  minimal: 'Minimalista',
  vibrant: 'Vibrante',
  elegant: 'Elegante',
  urban: 'Urbano',
  fresh: 'Fresco',
};

interface StoreConfigSummaryProps {
  config: PartialStoreConfig;
}

export function StoreConfigSummary({ config }: StoreConfigSummaryProps) {
  const rows: { label: string; value: string; show: boolean }[] = [
    { label: 'Nombre', value: config.name ?? '—', show: !!config.name },
    { label: 'Categoría', value: config.category ?? '—', show: !!config.category },
    { label: 'Estilo', value: STYLE_LABELS[config.style ?? ''] ?? config.style ?? '—', show: !!config.style },
    { label: 'Color principal', value: config.colors?.primary ?? '—', show: !!config.colors?.primary },
    { label: 'Páginas', value: config.pages?.join(', ') ?? '—', show: !!config.pages?.length },
    { label: 'Slogan', value: config.tagline ?? '—', show: !!config.tagline },
    { label: 'Logo', value: config.logo_url ? 'Sí' : 'Sin logo', show: true },
  ];

  return (
    <div
      className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm"
      data-testid="store-config-summary"
    >
      <h3 className="font-semibold text-gray-800 mb-3">Resumen de tu tienda</h3>
      <dl className="space-y-2">
        {rows.filter((r) => r.show).map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-gray-500 flex-shrink-0">{label}</dt>
            <dd className="text-gray-800 font-medium text-right truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
