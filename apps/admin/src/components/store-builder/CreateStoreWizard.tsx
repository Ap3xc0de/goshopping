'use client';

import { useState } from 'react';
import { TemplateGalleryStep } from './TemplateGalleryStep';

type WizardStep = 1 | 2 | 3;

interface WizardState {
  step: WizardStep;
  templateId: string | null;
}

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 1, label: 'Plantilla' },
  { id: 2, label: 'Marca' },
  { id: 3, label: 'Dominio' },
];

/**
 * 3-step store creation wizard (REQ-ADMIN-01), replacing the old AI chat
 * flow (ChatAssistant/GenerationProgress/ChatMessage/StyleSelector/
 * StoreConfigSummary — removed in a later commit of this same slice).
 *
 * PR 8a (this commit): the container + step 1 (TemplateGalleryStep) are
 * real. Steps 2/3 are lightweight placeholders — BrandingStep and
 * DomainStep replace them in PR 8b without changing this state machine.
 */
export function CreateStoreWizard() {
  const [state, setState] = useState<WizardState>({ step: 1, templateId: null });

  const handleTemplateSelect = (templateId: string) => {
    setState({ step: 2, templateId });
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

      {state.step === 1 && (
        <TemplateGalleryStep selectedTemplateId={state.templateId} onSelect={handleTemplateSelect} />
      )}

      {state.step === 2 && (
        <div data-testid="wizard-step-2-placeholder" className="text-sm text-gray-500">
          Paso de marca (branding) — próximo commit de este mismo slice.
        </div>
      )}

      {state.step === 3 && (
        <div data-testid="wizard-step-3-placeholder" className="text-sm text-gray-500">
          Paso de dominio — próximo commit de este mismo slice.
        </div>
      )}
    </div>
  );
}
