interface StyleOption {
  id: string;
  name: string;
  description: string;
  industries: string[];
  gradient: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Limpio, atemporal, fácil de leer',
    industries: ['Moda', 'Belleza', 'Joyería'],
    gradient: 'from-gray-50 to-gray-100',
  },
  {
    id: 'vibrant',
    name: 'Vibrante',
    description: 'Energético, moderno, llamativo',
    industries: ['Tecnología', 'Deportes', 'Electrónica'],
    gradient: 'from-purple-50 to-blue-50',
  },
  {
    id: 'elegant',
    name: 'Elegante',
    description: 'Sofisticado, premium, exclusivo',
    industries: ['Lujo', 'Alta costura', 'Relojes'],
    gradient: 'from-amber-50 to-yellow-50',
  },
  {
    id: 'urban',
    name: 'Urbano',
    description: 'Bold, impactante, cultura urbana',
    industries: ['Streetwear', 'Música', 'Arte'],
    gradient: 'from-zinc-800 to-zinc-900',
  },
  {
    id: 'fresh',
    name: 'Fresco',
    description: 'Natural, orgánico, cercano',
    industries: ['Alimentos', 'Mascotas', 'Hogar'],
    gradient: 'from-green-50 to-emerald-50',
  },
];

interface StyleSelectorProps {
  selected?: string;
  onSelect: (style: string) => void;
}

export function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2 mt-2" data-testid="style-selector">
      {STYLE_OPTIONS.map((option) => {
        const isSelected = selected === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`text-left rounded-xl border p-3 transition-all ${
              isSelected
                ? 'border-green-500 ring-2 ring-green-200 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            data-testid={`style-option-${option.id}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900">{option.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {option.industries.map((ind) => (
                    <span
                      key={ind}
                      className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
              {isSelected && (
                <div className="ml-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
