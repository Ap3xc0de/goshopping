import type { TemplateManifest } from '../../types';

/**
 * MINIMAL — Limpio, tipografía grande, mucho espacio blanco.
 * Inspirado en Apple Store, Aesop, COS.
 *
 * Reference template for the libs/template-catalog mechanism (Slice 5).
 * Ported 1:1 from apps/storefront/src/templates/minimal/config.ts. The
 * remaining 4 legacy templates (vibrant/elegant/urban/fresh) are ported in
 * Slice 6 — this slice only proves the registry + catalog.json mechanism.
 */
export const minimalManifest: TemplateManifest = {
  id: 'minimal',
  name: 'Minimal',
  description:
    'Limpio, tipografía grande, mucho espacio blanco. Para marcas premium que quieren elegancia sin ruido.',
  category: ['Moda premium', 'Joyería', 'Cosmética', 'Arte', 'Diseño'],

  colors: {
    primary: '0 0% 9%',
    primaryForeground: '0 0% 98%',
    secondary: '0 0% 96%',
    secondaryForeground: '0 0% 9%',
    accent: '39 45% 62%',
    accentForeground: '0 0% 9%',
    background: '0 0% 100%',
    foreground: '0 0% 9%',
    muted: '0 0% 96%',
    // BRAND-05: mirrors background/foreground — matches the current
    // hardcoded `bg-white` Navbar look until BRAND-06 (Slice 4) wires it up.
    navBackground: '0 0% 100%',
    navText: '0 0% 9%',
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
