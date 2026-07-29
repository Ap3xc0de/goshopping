export interface ComponentGenerationConfig {
  componentType:
    | 'navbar'
    | 'hero'
    | 'product_grid'
    | 'product_card'
    | 'cart_drawer'
    | 'footer'
    | string;
  storeSlug: string;
  storeName: string;
  storeStyle: string;
  context?: string;
}

export function buildComponentGenerationPrompt(config: ComponentGenerationConfig): string {
  const { componentType, storeSlug, storeName, storeStyle, context } = config;

  const lines: string[] = [
    `Genera el código del componente **${componentType}** para la tienda "${storeName}".`,
    '',
    '### Contexto de la tienda',
    `- Slug: ${storeSlug}`,
    `- Estilo visual: ${storeStyle}`,
  ];

  if (context) {
    lines.push('', '### Contexto adicional', context);
  }

  lines.push(
    '',
    '### Instrucciones',
    '1. Usa el componente base correspondiente del design system (ver DESIGN_SYSTEM.md).',
    '2. Personaliza el estilo usando CSS variables (`var(--brand-primary)`, etc.).',
    '3. Usa el storefront-sdk si el componente necesita datos (productos, config, carrito).',
    '4. Aplica reglas de ACCESSIBILITY.md (roles ARIA, labels, contraste).',
    '5. El componente debe ser responsive siguiendo RESPONSIVE.md.',
    '',
    '### Output esperado',
    'Un componente React `.tsx` listo para usar en el proyecto.',
  );

  return lines.join('\n');
}
