'use client';

import { useState } from 'react';
import { getAllTemplates, type TemplateManifest } from '@goshopping/template-catalog';
import { StorePreview } from './StorePreview';

interface TemplateGalleryStepProps {
  selectedTemplateId?: string | null;
  onSelect: (templateId: string) => void;
}

/**
 * Lists the shared template catalog (@goshopping/template-catalog) — the
 * SAME source apps/core validates PUT /stores/:storeId/template against.
 * Adding template #6 to the catalog makes it appear here with zero code
 * changes (REQ-CATALOG-07): this component never hardcodes template ids.
 */
export function TemplateGalleryStep({ selectedTemplateId, onSelect }: TemplateGalleryStepProps) {
  const availableTemplates = getAllTemplates().filter((t) => !t.archived);
  const [localHighlight, setLocalHighlight] = useState<string>(
    selectedTemplateId ?? availableTemplates[0]?.id,
  );

  const highlightedId = selectedTemplateId ?? localHighlight;
  const highlighted: TemplateManifest | undefined =
    availableTemplates.find((t) => t.id === highlightedId) ?? availableTemplates[0];

  const handleSelect = (template: TemplateManifest) => {
    setLocalHighlight(template.id);
    onSelect(template.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="template-gallery-step">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
        {availableTemplates.map((template) => {
          const isSelected = template.id === highlightedId;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template)}
              data-testid={`template-card-${template.id}`}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-brand-600 ring-2 ring-brand-200 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <p className="font-semibold text-sm text-gray-900">{template.name}</p>
              <p className="text-xs text-gray-500 mt-1">{template.description}</p>
            </button>
          );
        })}
      </div>

      {highlighted && (
        <StorePreview
          storeConfig={{
            name: 'Tu Tienda',
            colors: { primary: highlighted.colors.primary, secondary: highlighted.colors.background },
          }}
          fonts={highlighted.fonts}
        />
      )}
    </div>
  );
}
