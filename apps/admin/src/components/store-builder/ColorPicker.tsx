'use client';

import { useState } from 'react';

interface ColorPalette {
  name: string;
  primary: string;
  secondary?: string;
}

const PALETTES: Record<string, ColorPalette[]> = {
  moda: [
    { name: 'Rosa Nude', primary: '351 67% 75%', secondary: '0 0% 97%' },
    { name: 'Negro Clásico', primary: '0 0% 10%', secondary: '0 0% 97%' },
    { name: 'Camel', primary: '30 40% 60%', secondary: '30 15% 95%' },
  ],
  tecnologia: [
    { name: 'Azul Tech', primary: '217 91% 60%', secondary: '217 33% 17%' },
    { name: 'Violeta', primary: '258 89% 66%', secondary: '258 22% 12%' },
    { name: 'Cyan', primary: '188 86% 53%', secondary: '188 40% 12%' },
  ],
  alimentos: [
    { name: 'Verde Fresco', primary: '142 71% 45%', secondary: '142 40% 97%' },
    { name: 'Naranja', primary: '24 95% 53%', secondary: '24 100% 97%' },
    { name: 'Tierra', primary: '27 60% 48%', secondary: '27 40% 97%' },
  ],
  joyeria: [
    { name: 'Dorado', primary: '43 74% 49%', secondary: '43 40% 97%' },
    { name: 'Champagne', primary: '36 33% 75%', secondary: '0 0% 98%' },
    { name: 'Negro Lujo', primary: '0 0% 8%', secondary: '43 30% 90%' },
  ],
  general: [
    { name: 'Azul Marino', primary: '221 83% 53%', secondary: '221 33% 97%' },
    { name: 'Esmeralda', primary: '160 84% 39%', secondary: '160 33% 97%' },
    { name: 'Coral', primary: '0 72% 51%', secondary: '0 33% 97%' },
  ],
};

function hslToHex(hsl: string): string {
  const parts = hsl.split(' ');
  if (parts.length !== 3) return '#000000';
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface ColorPickerProps {
  category?: string;
  onSelect: (colors: { primary: string; secondary?: string }) => void;
}

export function ColorPicker({ category = 'general', onSelect }: ColorPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customHex, setCustomHex] = useState('');

  const palettes = PALETTES[category] ?? PALETTES.general;

  const handlePaletteSelect = (palette: ColorPalette) => {
    setSelected(palette.name);
    onSelect({ primary: palette.primary, secondary: palette.secondary });
  };

  const handleCustom = () => {
    if (/^#[0-9a-f]{6}$/i.test(customHex)) {
      setSelected('custom');
      onSelect({ primary: customHex });
    }
  };

  return (
    <div className="mt-2 space-y-2" data-testid="color-picker">
      <div className="grid grid-cols-1 gap-1.5">
        {palettes.map((palette) => {
          const primaryHex = hslToHex(palette.primary);
          const secondaryHex = palette.secondary ? hslToHex(palette.secondary) : '#ffffff';
          const isSelected = selected === palette.name;

          return (
            <button
              key={palette.name}
              onClick={() => handlePaletteSelect(palette)}
              className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-green-500 ring-2 ring-green-200 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              data-testid={`palette-${palette.name}`}
            >
              {/* Color preview */}
              <div className="flex gap-1 flex-shrink-0">
                <div
                  className="w-6 h-6 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: primaryHex }}
                />
                <div
                  className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                  style={{ backgroundColor: secondaryHex }}
                />
              </div>
              {/* Button preview */}
              <div
                className="text-[11px] font-medium px-2.5 py-1 rounded-full text-white flex-shrink-0"
                style={{ backgroundColor: primaryHex }}
              >
                Botón
              </div>
              <span className="text-xs text-gray-700">{palette.name}</span>
            </button>
          );
        })}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          placeholder="#HEX personalizado"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          data-testid="custom-hex-input"
        />
        <button
          onClick={handleCustom}
          className="text-xs px-3 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          Usar
        </button>
      </div>
    </div>
  );
}
