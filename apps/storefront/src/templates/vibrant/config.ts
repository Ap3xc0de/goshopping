import type { TemplateConfig } from '../types';

/**
 * VIBRANT — Colores fuertes, energía, CTAs agresivos.
 * Inspirado en Nike, Adidas, Best Buy.
 */
export const vibrantConfig: TemplateConfig = {
  id: 'vibrant',
  name: 'Vibrant',
  description:
    'Colores fuertes, energía, CTAs agresivos. Para marcas que quieren vender mucho y rápido.',
  category: ['Deportes', 'Tecnología', 'Gadgets', 'Fitness', 'Streetwear'],

  colors: {
    primary: '217 91% 60%',          // azul eléctrico #2563EB
    primaryForeground: '0 0% 100%',
    secondary: '222 47% 11%',        // azul oscuro
    secondaryForeground: '0 0% 100%',
    accent: '25 95% 53%',            // naranja #F97316
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
