export interface StoreGenerationConfig {
  name: string;
  slug: string;
  category: string;
  style: string;
  template: string;
  tagline?: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
  description?: string;
}

export function buildStoreGenerationPrompt(storeConfig: StoreGenerationConfig): string {
  const {
    name,
    slug,
    category,
    style,
    template,
    tagline,
    colors,
    description,
  } = storeConfig;

  const lines: string[] = [
    `Genera el código completo de la **HomePage** para la tienda "${name}".`,
    '',
    '### Datos de la tienda',
    `- Nombre: ${name}`,
    `- Slug: ${slug}`,
    `- Categoría: ${category}`,
    `- Estilo visual: ${style}`,
    `- Template: ${template}`,
  ];

  if (tagline) lines.push(`- Tagline: "${tagline}"`);
  if (description) lines.push(`- Descripción: ${description}`);
  if (colors?.primary) lines.push(`- Color primario: ${colors.primary}`);
  if (colors?.secondary) lines.push(`- Color secundario: ${colors.secondary}`);
  if (colors?.accent) lines.push(`- Color acento: ${colors.accent}`);

  lines.push(
    '',
    '### Instrucciones',
    '1. Usa el template seleccionado como guía para las secciones y el orden.',
    '2. Usa SOLO los componentes del design system listados en DESIGN_SYSTEM.md y COMPONENTS.md.',
    '3. Usa `useProducts`, `useStoreConfig`, `useCart` del `@goshopping/storefront-sdk`.',
    '4. Aplica las reglas de LAYOUT.md para el tipo de negocio correspondiente.',
    '5. La paleta de colores debe seguir COLOR_ENGINE.md.',
    '6. La tipografía debe seguir TYPOGRAPHY.md con el par correspondiente al estilo.',
    '7. El código debe pasar las reglas de ACCESSIBILITY.md y RESPONSIVE.md.',
    '8. Incluir SEO metadata siguiendo SEO.md.',
    '',
    '### Output esperado',
    'Un archivo `.tsx` completo de la HomePage que:',
    '- Sea un Server Component o Client Component de Next.js App Router',
    '- Incluya todos los imports necesarios',
    '- Use el storefront-sdk para datos',
    '- Sea production-ready',
  );

  return lines.join('\n');
}
