'use client';

import { useState } from 'react';
import { BrandingStep, type BrandingDraft } from './BrandingStep';
import { DomainStep } from './DomainStep';
import { useStore } from '@/lib/hooks/useStore';
import { api } from '@/lib/api';

type WizardStep = 1 | 2;

interface WizardState {
  step: WizardStep;
  submitting: boolean;
  error: string | null;
}

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 1, label: 'Marca' },
  { id: 2, label: 'Dominio' },
];

/**
 * 2-step store creation wizard (CATALOG-03/ADMIN-05, Slice 9) — the old
 * step 1 (TemplateGalleryStep) was removed: `minimal` is now the only
 * active template (CATALOG-01), and migration 008 already sets
 * `stores.template_id DEFAULT 'minimal'`, so every new store is created
 * with the right template with zero wizard involvement. This intentionally
 * drops the `PUT /stores/:storeId/template` call entirely instead of
 * keeping it hardcoded to 'minimal' — fewer moving parts, one less network
 * call that could fail on step 1, and no behavior change (the DB default
 * already produces the same result).
 *
 * Replaces the old 3-step AI chat flow (ChatAssistant/GenerationProgress/
 * ChatMessage/StyleSelector/StoreConfigSummary — removed in an earlier
 * commit of this same slice).
 *
 * Local useState state machine — no new state library, matching the rest
 * of the repo. Confirming step 1 (Marca) persists branding; if it fails,
 * the wizard stays on step 1 showing the error (no partial state is
 * persisted client-side that would block a retry).
 */
export function CreateStoreWizard() {
  const { storeId } = useStore();
  const [state, setState] = useState<WizardState>({
    step: 1,
    submitting: false,
    error: null,
  });
  const [hostname, setHostname] = useState<string | null>(null);

  const handleBrandingConfirm = async (branding: BrandingDraft) => {
    if (!storeId) return;
    setState((s) => ({ ...s, submitting: true, error: null }));
    try {
      await api.updateBranding(storeId, { colors: branding.colors, fonts: branding.fonts });
      setState((s) => ({ ...s, step: 2, submitting: false }));

      // Fetched after the step advances rather than awaited alongside the
      // write: the hostname is informational, so a slow or failing read
      // should leave step 2 in its pending state, never block reaching it.
      api
        .getStoreDomain(storeId)
        .then((domain) => setHostname(domain.hostname))
        .catch(() => setHostname(null));
    } catch (err) {
      setState((s) => ({
        ...s,
        submitting: false,
        error:
          err instanceof Error
            ? err.message
            : 'No pudimos guardar los cambios. Intentá de nuevo.',
      }));
    }
  };

  return (
    <div data-testid="create-store-wizard" className="space-y-6">
      <ol className="flex items-center gap-4 text-sm" data-testid="wizard-stepper">
        {STEPS.map((s) => (
          <li
            key={s.id}
            data-testid={`wizard-step-${s.id}`}
            className={s.id === state.step ? 'font-semibold text-brand-700' : 'text-gray-400'}
          >
            {s.id}. {s.label}
          </li>
        ))}
      </ol>

      {state.error && (
        <p className="text-sm text-red-600" data-testid="wizard-error">
          {state.error}
        </p>
      )}

      {state.step === 1 && <BrandingStep onConfirm={handleBrandingConfirm} />}

      {state.step === 2 && <DomainStep hostname={hostname} />}
    </div>
  );
}
