import type { TemplateManifest } from '../../types';

/**
 * VIBRANT — Colores fuertes, energía, CTAs agresivos.
 * Inspirado en Nike, Adidas, Best Buy.
 *
 * Ported 1:1 from apps/storefront/src/templates/vibrant/config.ts (Slice 6).
 *
 * ARCHIVED (CATALOG-01, Slice 9): the storefront moved to a single active
 * template (`minimal`). Kept registered — NOT deleted — so any store still
 * assigned to `vibrant` keeps resolving its theme without error (CATALOG-02),
 * and reactivating it later only requires `archived: false` + regenerating
 * catalog.json (no code loss).
 */
export const vibrantManifest: TemplateManifest = {
  id: 'vibrant',
  name: 'Vibrant',
  description:
    'Colores fuertes, energía, CTAs agresivos. Para marcas que quieren vender mucho y rápido.',
  category: ['Deportes', 'Tecnología', 'Gadgets', 'Fitness', 'Streetwear'],
  archived: true,

  colors: {
    primary: '217 91% 60%',
    primaryForeground: '0 0% 100%',
    secondary: '222 47% 11%',
    secondaryForeground: '0 0% 100%',
    accent: '25 95% 53%',
    accentForeground: '0 0% 100%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    muted: '210 40% 96%',
  },

  fonts: {
    heading: 'Space Grotesk',
    body: 'Inter',
  },

  components: {
    navbar: 'solid',
    hero: 'slider',
    footer: 'full',
    productCard: 'expanded',
  },

  homeSections: [
    'PromoBanner',
    'HeroSlider',
    'CategoryShowcase',
    'ProductGrid',
    'CountdownTimer',
    'ProductGrid',
    'TrustBadges',
    'TestimonialCards',
    'NewsletterSignup',
  ],

  style: {
    sectionSpacing: '4rem',
    borderRadius: 'rounded',
    shadows: 'medium',
  },
};
