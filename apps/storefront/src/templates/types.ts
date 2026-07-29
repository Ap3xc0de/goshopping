export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  category: string[];

  preview_image?: string;

  /** Colores — valores HSL sin hsl(), e.g. "142 71% 45%" */
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    foreground: string;
    muted: string;
  };

  /** Google Font names */
  fonts: {
    heading: string;
    body: string;
  };

  /** Variantes de componentes del Design System */
  components: {
    navbar: 'transparent' | 'solid' | 'floating';
    hero: 'centered' | 'split' | 'slider' | 'minimal' | 'video';
    footer: 'full' | 'minimal';
    productCard: 'compact' | 'expanded';
  };

  /** Orden de secciones en la HomePage */
  homeSections: string[];

  style: {
    sectionSpacing: string;
    borderRadius: 'sharp' | 'rounded' | 'pill';
    shadows: 'none' | 'subtle' | 'medium' | 'dramatic';
  };
}
