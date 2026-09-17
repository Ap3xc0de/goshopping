import type { TemplateManifest } from '../../types';

/**
 * FRESH — Colores pastel, bordes redondeados, friendly.
 * Inspirado en Notion, Slack, Headspace.
 *
 * Ported 1:1 from apps/storefront/src/templates/fresh/config.ts (Slice 6).
 *
 * ARCHIVED (CATALOG-01, Slice 9): the storefront moved to a single active
 * template (`minimal`). Kept registered — NOT deleted — so any store still
 * assigned to `fresh` keeps resolving its theme without error (CATALOG-02),
 * and reactivating it later only requires `archived: false` + regenerating
 * catalog.json (no code loss).
 */
export const freshManifest: TemplateManifest = {
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
  archived: true,

  colors: {
    primary: '161 72% 31%',
    primaryForeground: '0 0% 100%',
    secondary: '330 85% 62%',
    secondaryForeground: '0 0% 100%',
    accent: '330 85% 62%',
    accentForeground: '0 0% 100%',
    background: '30 100% 97%',
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
