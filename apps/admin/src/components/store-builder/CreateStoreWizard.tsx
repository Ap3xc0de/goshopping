'use client';

import { useState } from 'react';
import { TemplateGalleryStep } from './TemplateGalleryStep';
import { BrandingStep, type BrandingDraft } from './BrandingStep';
import { DomainStep } from './DomainStep';
import { useStore } from '@/lib/hooks/useStore';
import { api } from '@/lib/api';

type WizardStep = 1 | 2 | 3;

interface WizardState {
  step: WizardStep;
  templateId: string | null;
  submitting: boolean;
  error: string | null;
}

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 1, label: 'Plantilla' },
  { id: 2, label: 'Marca' },
  { id: 3, label: 'Dominio' },
];

/**
 * 3-step store creation wizard (REQ-ADMIN-01), replacing the old AI chat
 * flow (ChatAssistant/GenerationProgress/ChatMessage/StyleSelector/
 * StoreConfigSummary — removed in the next commit of this same slice).
 *
 * Local useState state machine — no new state library, matching the rest
 * of the repo. Confirming step 2 fires PUT /template and PUT /branding in
 * parallel; if either fails, the wizard stays on step 2 showing the error
 * (no partial state is persisted client-side that would block a retry).
 */
export function CreateStoreWizard() {
  const { storeId } = useStore();
  const [state, setState] = useState<WizardState>({
    step: 1,
    templateId: null,
    submitting: false,
    error: null,
  });

  const handleTemplateSelect = (templateId: string) => {
    setState((s) => ({ ...s, step: 2, templateId, error: null }));
  };

  const handleBrandingConfirm = async (branding: BrandingDraft) => {
    if (!storeId || !state.templateId) return;
    setState((s) => ({ ...s, submitting: true, error: null }));
    try {
      await Promise.all([
        api.updateStoreTemplate(storeId, state.templateId),
        api.updateBranding(storeId, { colors: branding.colors, fonts: branding.fonts }),
      ]);
      setState((s) => ({ ...s, step: 3, submitting: false }));
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

      {state.step === 1 && (
        <TemplateGalleryStep selectedTemplateId={state.templateId} onSelect={handleTemplateSelect} />
      )}

      {state.step === 2 && <BrandingStep onConfirm={handleBrandingConfirm} />}

      {state.step === 3 && (
        // KNOWN GAP (documented in apply-progress): no backend endpoint yet
        // exposes a store's assigned hostname, so this always renders the
        // pending state. See DomainStep.tsx and this slice's apply-progress.
        <DomainStep hostname={null} />
      )}
    </div>
  );
}
