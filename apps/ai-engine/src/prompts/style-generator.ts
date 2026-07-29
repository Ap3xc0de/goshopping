export interface StyleGenerationConfig {
  storeName: string;
  storeStyle: string;
  storeCategory: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
}

export function buildStyleGenerationPrompt(config: StyleGenerationConfig): string {
  const { storeName, storeStyle, storeCategory, colors } = config;

  const lines: string[] = [
    `Genera la paleta de colores y variables CSS para la tienda "${storeName}".`,
    '',
    '### Datos del negocio',
    `- Estilo: ${storeStyle}`,
    `- Categoría: ${storeCategory}`,
  ];

  if (colors?.primary) lines.push(`- Color primario sugerido: ${colors.primary}`);
  if (colors?.secondary) lines.push(`- Color secundario sugerido: ${colors.secondary}`);
  if (colors?.accent) lines.push(`- Color acento sugerido: ${colors.accent}`);

  lines.push(
    '',
    '### Instrucciones',
    '1. Genera una paleta de 10 tokens siguiendo COLOR_ENGINE.md.',
    '2. Los colores deben ser coherentes con el estilo y la industria.',
    '3. Verificar contraste WCAG AA (4.5:1 para texto normal).',
    '4. Usar formato HSL sin la función hsl(): `220 14% 96%`',
    '5. Incluir las variables CSS para el par tipográfico de TYPOGRAPHY.md.',
    '',
    '### Output esperado',
    'Variables CSS en formato `:root { --brand-primary: ...; ... }` listas para pegar en `globals.css`.',
  );

  return lines.join('\n');
}
