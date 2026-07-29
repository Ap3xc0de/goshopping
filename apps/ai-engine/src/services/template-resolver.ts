export interface TemplateRecommendation {
  template: string;
  reason: string;
}

// Category → best-fit template map
const CATEGORY_TEMPLATE_MAP: Record<string, string> = {
  // Moda / Ropa
  moda: 'minimal',
  ropa: 'minimal',
  indumentaria: 'minimal',
  fashion: 'minimal',

  // Joyería / Lujo
  joyeria: 'elegant',
  joyería: 'elegant',
  lujo: 'elegant',
  relojes: 'elegant',
  'alta costura': 'elegant',

  // Alimentos / Bebidas
  alimentos: 'fresh',
  comida: 'fresh',
  bebidas: 'fresh',
  organico: 'fresh',
  orgánico: 'fresh',
  naturaleza: 'fresh',
  plantas: 'fresh',
  mascotas: 'fresh',
  hogar: 'fresh',

  // Tecnología
  tecnologia: 'vibrant',
  tecnología: 'vibrant',
  electronica: 'vibrant',
  electrónica: 'vibrant',
  gadgets: 'vibrant',
  software: 'vibrant',

  // Deportes / Streetwear
  deportes: 'vibrant',
  sport: 'vibrant',
  streetwear: 'urban',
  urbano: 'urban',
  skate: 'urban',
  musica: 'urban',
  música: 'urban',
  arte: 'urban',

  // Belleza
  belleza: 'minimal',
  cosmetica: 'minimal',
  cosmetica_lujo: 'elegant',
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  minimal: 'Estilo limpio y atemporal — ideal para joyería, moda y belleza',
  vibrant: 'Energético y moderno — ideal para tecnología y deportes',
  elegant: 'Sofisticado y premium — ideal para lujo y alta costura',
  urban: 'Bold e impactante — ideal para streetwear y cultura urbana',
  fresh: 'Natural y cercano — ideal para alimentos, hogar y mascotas',
};

export class TemplateResolver {
  resolve(category: string): TemplateRecommendation {
    const key = category.toLowerCase().trim();

    // Exact match
    if (CATEGORY_TEMPLATE_MAP[key]) {
      const template = CATEGORY_TEMPLATE_MAP[key];
      return { template, reason: TEMPLATE_DESCRIPTIONS[template] };
    }

    // Partial match — check if key contains any known category word
    for (const [catKey, template] of Object.entries(CATEGORY_TEMPLATE_MAP)) {
      if (key.includes(catKey) || catKey.includes(key)) {
        return { template, reason: TEMPLATE_DESCRIPTIONS[template] };
      }
    }

    // Default
    return { template: 'minimal', reason: TEMPLATE_DESCRIPTIONS.minimal };
  }

  resolveFromStyle(style: string): string {
    const validStyles = ['minimal', 'vibrant', 'elegant', 'urban', 'fresh'];
    return validStyles.includes(style) ? style : 'minimal';
  }
}
