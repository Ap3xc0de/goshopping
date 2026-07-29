import type { TemplateConfig } from '../types';

/**
 * URBAN — Sans-serif bold, grids asimétricos, estilo streetwear.
 * Inspirado en Supreme, Palace, Bape.
 */
export const urbanConfig: TemplateConfig = {
  id: 'urban',
  name: 'Urban',
  description:
    'Sans-serif bold, grids asimétricos, estilo streetwear. Joven y atrevido.',
  category: ['Streetwear', 'Skate', 'Música', 'Arte urbano', 'Sneakers'],

  colors: {
    primary: '0 0% 5%',              // negro profundo
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 9%',
    secondaryForeground: '0 0% 100%',
    accent: '48 97% 55%',            // amarillo #FACC15
    accentForeground: '0 0% 0%',
    background: '0 0% 100%',
    foreground: '0 0% 5%',
    muted: '0 0% 95%',
  },

  fonts: {
    heading: 'Bebas Neue',
    body: 'DM Sans',
  },

  components: {
    navbar: 'floating',
    hero: 'minimal',
    footer: 'minimal',
    productCard: 'compact',
  },

  homeSections: [
    'HeroMinimal',
    'ProductGrid',
    'PromoBanner',
    'CategoryShowcase',
    'ProductGrid',
    'TrustBadges',
  ],

  style: {
    sectionSpacing: '3rem',
    borderRadius: 'rounded',
    shadows: 'dramatic',
  },
};
