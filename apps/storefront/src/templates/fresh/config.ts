import type { TemplateConfig } from '../types';

/**
 * FRESH — Colores pastel, bordes redondeados, friendly.
 * Inspirado en Notion, Slack, Headspace.
 */
export const freshConfig: TemplateConfig = {
  id: 'fresh',
  name: 'Fresh',
  description:
    'Colores pastel, bordes redondeados, friendly. Accesible y cálido.',
  category: [
    'Alimentos',
    'Bebidas',
    'Productos naturales',
    'Bebés',
    'Mascotas',
    'Hogar',
  ],

  colors: {
    primary: '161 72% 31%',          // verde suave #059669
    primaryForeground: '0 0% 100%',
    secondary: '330 85% 62%',        // rosa #EC4899
    secondaryForeground: '0 0% 100%',
    accent: '330 85% 62%',
    accentForeground: '0 0% 100%',
    background: '30 100% 97%',       // crema cálida #FFF8F0
    foreground: '220 13% 13%',
    muted: '30 60% 93%',
  },

  fonts: {
    heading: 'Nunito',
    body: 'Nunito Sans',
  },

  components: {
    navbar: 'solid',
    hero: 'split',
    footer: 'full',
    productCard: 'expanded',
  },

  homeSections: [
    'HeroSplit',
    'TrustBadges',
    'CategoryShowcase',
    'ProductGrid',
    'AboutSection',
    'TestimonialCards',
    'FAQAccordion',
    'NewsletterSignup',
    'ContactForm',
  ],

  style: {
    sectionSpacing: '4rem',
    borderRadius: 'pill',
    shadows: 'subtle',
  },
};
