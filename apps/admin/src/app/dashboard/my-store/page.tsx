'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useBranding } from '@/lib/hooks/useBranding';
import { useStore } from '@/lib/hooks/useStore';
import { api } from '@/lib/api';
import { ALLOWED_FONTS } from '@/components/store-builder/BrandingStep';
import { MiTiendaPreview } from '@/components/store-builder/MiTiendaPreview';
import { Toast } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { hexToHslString, hslStringToHex, isValidHslString } from '@/lib/color';
import type { BrandColors, StoreBranding } from '@/lib/types';

type RadiusOption = 'sm' | 'md' | 'lg' | 'xl';

const RADIUS_OPTIONS: { value: RadiusOption; label: string }[] = [
  { value: 'sm', label: 'Pequeño' },
  { value: 'md', label: 'Medio' },
  { value: 'lg', label: 'Grande' },
  { value: 'xl', label: 'Extra grande' },
];

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: 'primary', label: 'Primario' },
  { key: 'primary_foreground', label: 'Texto sobre primario' },
  { key: 'secondary', label: 'Secundario' },
  { key: 'secondary_foreground', label: 'Texto sobre secundario' },
  { key: 'accent', label: 'Acento' },
  { key: 'accent_foreground', label: 'Texto sobre acento' },
  { key: 'background', label: 'Fondo' },
  { key: 'foreground', label: 'Texto principal' },
  { key: 'muted', label: 'Fondo tenue' },
  { key: 'nav_background', label: 'Fondo del menú de navegación' },
  { key: 'nav_text', label: 'Texto del menú de navegación' },
];

export default function MyStorePage() {
  const { storeId, storeName } = useStore();
  const { branding, loading, error, save, saving, saveError } = useBranding();

  const [draft, setDraft] = useState<StoreBranding>({});
  const [dirty, setDirty] = useState(false);
  const [colorErrors, setColorErrors] = useState<Partial<Record<keyof BrandColors, string>>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hostname, setHostname] = useState<string | null>(null);

  // Keep the draft synced with the server's branding on first load and
  // after Restablecer — but never while the user has unsaved edits, so a
  // background refetch (e.g. reload()) can't stomp on in-progress typing.
  useEffect(() => {
    if (branding && !dirty) {
      setDraft(branding);
    }
  }, [branding, dirty]);

  // Informational only (REQ ADMIN "Ver mi tienda" link) — a slow or
  // failing read should never block the editor from rendering.
  useEffect(() => {
    if (!storeId) return;
    api
      .getStoreDomain(storeId)
      .then((domain) => setHostname(domain.hostname))
      .catch(() => setHostname(null));
  }, [storeId]);

  const updateColor = (key: keyof BrandColors, value: string) => {
    setDraft((d) => ({ ...d, colors: { ...d.colors, [key]: value } }));
    setDirty(true);
    setColorErrors((errs) => {
      const next = { ...errs };
      if (value === '' || isValidHslString(value)) {
        delete next[key];
      } else {
        next[key] = 'Formato inválido — usa "H S% L%", ej. "142 71% 45%"';
      }
      return next;
    });
  };

  const updateFont = (key: 'heading' | 'body', value: string) => {
    setDraft((d) => ({ ...d, fonts: { ...d.fonts, [key]: value || undefined } }));
    setDirty(true);
  };

  const updateRadius = (value: RadiusOption) => {
    setDraft((d) => ({ ...d, radius: value }));
    setDirty(true);
  };

  const hasErrors = Object.keys(colorErrors).length > 0;

  const handleReset = () => {
    if (branding) setDraft(branding);
    setColorErrors({});
    setDirty(false);
  };

  const handleSave = async () => {
    if (hasErrors) return;
    const ok = await save(draft);
    if (ok) {
      setDirty(false);
      setToast({ message: 'Cambios guardados', type: 'success' });
    } else {
      setToast({ message: saveError ?? 'No pudimos guardar los cambios', type: 'error' });
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mi Tienda</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Personalizá los colores, tipografías y estilo de tu tienda.
          </p>
        </div>
        {hostname && (
          <a
            href={`https://${hostname}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-600"
          >
            Ver mi tienda
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" data-testid="branding-load-error">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {/* Colores */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Colores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COLOR_FIELDS.map(({ key, label }) => {
                const value = draft.colors?.[key] ?? '';
                const fieldError = colorErrors[key];
                return (
                  <div key={key} className="text-xs text-gray-600 space-y-1">
                    <span className="block">{label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label={`${label} (selector)`}
                        value={value && isValidHslString(value) ? hslStringToHex(value) : '#ffffff'}
                        onChange={(e) => updateColor(key, hexToHslString(e.target.value))}
                        className="h-8 w-8 shrink-0 rounded border border-gray-200 p-0"
                      />
                      <input
                        type="text"
                        aria-label={label}
                        value={value}
                        placeholder="Usar la de la plantilla"
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                    {fieldError && <p className="text-[11px] text-red-600">{fieldError}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tipografía */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Tipografía</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-xs text-gray-600 block">
                Fuente de títulos
                <select
                  aria-label="Fuente de títulos"
                  value={draft.fonts?.heading ?? ''}
                  onChange={(e) => updateFont('heading', e.target.value)}
                  className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">Usar la de la plantilla</option>
                  {ALLOWED_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-600 block">
                Fuente de texto
                <select
                  aria-label="Fuente de texto"
                  value={draft.fonts?.body ?? ''}
                  onChange={(e) => updateFont('body', e.target.value)}
                  className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">Usar la de la plantilla</option>
                  {ALLOWED_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Estilo */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Estilo</h2>
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Radio de bordes">
              {RADIUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={(draft.radius ?? 'md') === value}
                  onClick={() => updateRadius(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    (draft.radius ?? 'md') === value
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || hasErrors || saving}
              className="px-4 py-2.5 bg-brand-700 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!dirty}
              className="px-4 py-2.5 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Restablecer
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6">
          <MiTiendaPreview branding={draft} storeName={storeName ?? undefined} />
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
