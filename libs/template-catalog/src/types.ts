/**
 * TemplateManifest is the shared contract for a storefront template.
 *
 * It extends the shape that `apps/storefront/src/templates/types.ts` already
 * used (`TemplateConfig`) with `archived`, so a template can be retired from
 * new assignments (e.g. Admin gallery, catalog.json validation) without
 * deleting its manifest or code.
 */
export interface TemplateManifest {
  id: string;
  name: string;
  description: string;
  category: string[];

  preview_image?: string;

  /** Marks a template as no longer offered for new stores. Defaults to false. */
  archived?: boolean;

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
    /**
     * Optional dedicated Navbar colors (BRAND-01/BRAND-05). When absent,
     * consumers (e.g. buildTemplateCSSVars) fall back to background/foreground.
     */
    navBackground?: string;
    navText?: string;
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
