interface GenerationProgressProps {
  isGenerating: boolean;
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  previewUrl?: string;
  onViewPreview: () => void;
  onPublish?: () => void;
  onRegenerate?: () => void;
}

const GENERATION_STEPS = [
  'Preparando...',
  'Generando HomePage...',
  'Generando Catálogo...',
  'Validando seguridad...',
  '¡Lista!',
];

export function GenerationProgress({
  isGenerating,
  currentStep,
  totalSteps,
  completed,
  onViewPreview,
  onPublish,
  onRegenerate,
}: GenerationProgressProps) {
  const progress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;
  const stepLabel =
    GENERATION_STEPS[Math.min(currentStep, GENERATION_STEPS.length - 1)] ?? 'Procesando...';

  if (!isGenerating && !completed) return null;

  return (
    <div
      className="border border-gray-200 rounded-xl p-4 bg-white"
      data-testid="generation-progress"
    >
      {completed ? (
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">¡Tu tienda está lista!</p>
          <p className="text-xs text-gray-500 mb-4">
            Todas las páginas fueron generadas y validadas.
          </p>
          <button
            onClick={onViewPreview}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
            data-testid="view-preview-btn"
          >
            Ver preview →
          </button>
          {onPublish && (
            <button
              onClick={onPublish}
              className="w-full mt-2 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium rounded-xl transition-colors"
              data-testid="publish-btn"
            >
              Publicar Tienda
            </button>
          )}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="w-full mt-2 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
              data-testid="regenerate-btn"
            >
              Regenerar
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">{stepLabel}</p>
            <span className="text-xs text-gray-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-700 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
              data-testid="progress-bar"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Paso {currentStep} de {totalSteps}
          </p>
        </div>
      )}
    </div>
  );
}
