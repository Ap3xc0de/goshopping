import type { TemplateConfig } from '../types';

/**
 * ELEGANT — Serif, transiciones suaves. Sofisticación y lujo.
 * Inspirado en Dior, Nespresso, Four Seasons.
 */
export const elegantConfig: TemplateConfig = {
  id: 'elegant',
  name: 'Elegant',
  description:
    'Serif, fondos oscuros opcionales, transiciones suaves. Sofisticación y lujo.',
  category: ['Vinos', 'Gastronomía', 'Hoteles', 'Moda de lujo', 'Perfumería'],

  colors: {
    primary: '37 43% 57%',           // dorado #c9a96e
    primaryForeground: '0 0% 100%',
    secondary: '240 35% 14%',        // azul muy oscuro #1a1a2e
    secondaryForeground: '0 0% 95%',
    accent: '37 43% 57%',
    accentForeground: '0 0% 100%',
    background: '36 67% 97%',        // crema cálida #faf7f2
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
