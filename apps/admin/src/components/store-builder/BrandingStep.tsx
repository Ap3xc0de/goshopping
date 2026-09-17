'use client';

import { useState } from 'react';
import { ColorPicker } from './ColorPicker';

/**
 * Mirrors apps/core/internal/models/branding.go#AllowedFonts. This is a
 * client-side PRE-check only for UX (fail fast, no round-trip) — the
 * backend remains the source of truth and re-validates on
 * PUT /stores/:storeId/branding regardless of what this list says.
 */
export const ALLOWED_FONTS = [
  'Inter',
  'Playfair Display',
  'Space Grotesk',
  'Cormorant Garamond',
  'Lora',
  'Bebas Neue',
  'DM Sans',
  'Nunito',
  'Nunito Sans',
  'Poppins',
  'Outfit',
] as const;

export interface BrandingColorsDraft {
  primary?: string;
  background?: string;
}

export interface BrandingDraft {
  colors: BrandingColorsDraft;
  fonts: { heading?: string; body?: string };
}

interface BrandingStepProps {
  category?: string;
  onConfirm: (branding: BrandingDraft) => void;
}

/**
 * REQ-ADMIN-03 — reuses ColorPicker.tsx as-is (its public contract,
 * `onSelect: (colors: { primary, secondary? }) => void`, is untouched).
 *
 * MAPPING DECISION — pending product confirmation, documented in this
 * slice's apply-progress artifact (sdd/storefront-templates-multidomain/
 * apply-progress): ColorPicker only ever returns 2 of the 9 HSL fields
 * BrandColors has. `primary` -> `colors.primary` (unambiguous). `secondary`
 * -> `colors.background`, because every "secondary" value in ColorPicker's
 * own PALETTES is a light neutral tone meant for surfaces, not a
 * text/foreground accent. The conservative choice: the other 7 HSL fields
 * (primary_foreground, secondary_foreground, accent, accent_foreground,
 * foreground, muted) are left `undefined` — never sent as `""` — so the
 * backend (branding.go, all fields `omitempty`) falls back to the
 * template manifest's own defaults instead of being overwritten.
 */
export function BrandingStep({ category, onConfirm }: BrandingStepProps) {
  const [colors, setColors] = useState<BrandingColorsDraft>({});
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [fontError, setFontError] = useState<string | null>(null);

  const handlePaletteSelect = (palette: { primary: string; secondary?: string }) => {
    setColors({ primary: palette.primary, background: palette.secondary });
  };

  const isAllowedFont = (font: string): boolean =>
    (ALLOWED_FONTS as readonly string[]).includes(font);

  const handleSubmit = () => {
    if (heading && !isAllowedFont(heading)) {
      setFontError(`"${heading}" no está en la lista de fuentes permitidas.`);
      return;
    }
    if (body && !isAllowedFont(body)) {
      setFontError(`"${body}" no está en la lista de fuentes permitidas.`);
      return;
    }
    setFontError(null);
    onConfirm({
      colors,
      fonts: { heading: heading || undefined, body: body || undefined },
    });
  };

  return (
    <div data-testid="branding-step" className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-900 mb-1">Colores de marca</p>
        <ColorPicker category={category} onSelect={handlePaletteSelect} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-600 block">
          Fuente de títulos
          <input
            type="text"
            list="branding-allowed-fonts-heading"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="Usar la de la plantilla"
            data-testid="font-heading-input"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <datalist id="branding-allowed-fonts-heading">
            {ALLOWED_FONTS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <label className="text-xs text-gray-600 block">
          Fuente de texto
          <input
            type="text"
            list="branding-allowed-fonts-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Usar la de la plantilla"
            data-testid="font-body-input"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <datalist id="branding-allowed-fonts-body">
            {ALLOWED_FONTS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
      </div>

      {fontError && (
        <p className="text-xs text-red-600" data-testid="font-error">
          {fontError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full py-2.5 bg-brand-700 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
        data-testid="branding-confirm-btn"
      >
        Continuar
      </button>
    </div>
  );
}
