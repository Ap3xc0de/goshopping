import type { TemplateManifest } from '../../types';

/**
 * ELEGANT — Serif, transiciones suaves. Sofisticación y lujo.
 * Inspirado en Dior, Nespresso, Four Seasons.
 *
 * Ported 1:1 from apps/storefront/src/templates/elegant/config.ts (Slice 6).
 */
export const elegantManifest: TemplateManifest = {
  id: 'elegant',
  name: 'Elegant',
  description:
    'Serif, fondos oscuros opcionales, transiciones suaves. Sofisticación y lujo.',
  category: ['Vinos', 'Gastronomía', 'Hoteles', 'Moda de lujo', 'Perfumería'],

  colors: {
    primary: '37 43% 57%',
    primaryForeground: '0 0% 100%',
    secondary: '240 35% 14%',
    secondaryForeground: '0 0% 95%',
    accent: '37 43% 57%',
    accentForeground: '0 0% 100%',
    background: '36 67% 97%',
    foreground: '240 35% 14%',
    muted: '36 40% 92%',
  },

  fonts: {
    heading: 'Cormorant Garamond',
    body: 'Lora',
  },

  components: {
    navbar: 'transparent',
    hero: 'centered',
    footer: 'full',
    productCard: 'expanded',
  },

  homeSections: [
    'HeroCentered',
    'ProductGrid',
    'AboutSection',
    'CategoryShowcase',
    'TestimonialCards',
    'NewsletterSignup',
  ],

  style: {
    sectionSpacing: '5rem',
    borderRadius: 'sharp',
    shadows: 'subtle',
  },
};
