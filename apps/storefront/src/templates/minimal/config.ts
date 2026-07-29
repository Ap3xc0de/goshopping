import type { TemplateConfig } from '../types';

/**
 * MINIMAL — Limpio, tipografía grande, mucho espacio blanco.
 * Inspirado en Apple Store, Aesop, COS.
 */
export const minimalConfig: TemplateConfig = {
  id: 'minimal',
  name: 'Minimal',
  description:
    'Limpio, tipografía grande, mucho espacio blanco. Para marcas premium que quieren elegancia sin ruido.',
  category: ['Moda premium', 'Joyería', 'Cosmética', 'Arte', 'Diseño'],

  colors: {
    primary: '0 0% 9%',              // casi negro
    primaryForeground: '0 0% 98%',
    secondary: '0 0% 96%',
    secondaryForeground: '0 0% 9%',
    accent: '39 45% 62%',            // beige dorado sutil
    accentForeground: '0 0% 9%',
    background: '0 0% 100%',
    foreground: '0 0% 9%',
    muted: '0 0% 96%',
  },

  fonts: {
    heading: 'Playfair Display',
    body: 'Inter',
  },

  components: {
    navbar: 'transparent',
    hero: 'split',
    footer: 'minimal',
    productCard: 'expanded',
  },

  homeSections: [
    'HeroSplit',
    'CategoryShowcase',
    'ProductGrid',
    'AboutSection',
    'TestimonialCards',
    'NewsletterSignup',
  ],

  style: {
    sectionSpacing: '6rem',
    borderRadius: 'sharp',
    shadows: 'none',
  },
};
