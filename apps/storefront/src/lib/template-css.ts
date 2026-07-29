import type { TemplateConfig } from '@/templates/types';

/** Maps a Google Font name to the CSS variable defined in layout.tsx */
const FONT_VAR_MAP: Record<string, string> = {
  'Inter': 'var(--font-inter)',
  'Playfair Display': 'var(--font-playfair-display)',
  'Space Grotesk': 'var(--font-space-grotesk)',
  'Cormorant Garamond': 'var(--font-cormorant-garamond)',
  'Lora': 'var(--font-lora)',
  'Bebas Neue': 'var(--font-bebas-neue)',
  'DM Sans': 'var(--font-dm-sans)',
  'Nunito': 'var(--font-nunito)',
  'Nunito Sans': 'var(--font-nunito-sans)',
};

const BORDER_RADIUS_MAP: Record<TemplateConfig['style']['borderRadius'], Record<string, string>> = {
  sharp: {
    '--radius-sm': '0.125rem',
    '--radius-md': '0.25rem',
    '--radius-lg': '0.375rem',
    '--radius-xl': '0.5rem',
  },
  rounded: {
    '--radius-sm': '0.375rem',
    '--radius-md': '0.5rem',
    '--radius-lg': '0.75rem',
    '--radius-xl': '1rem',
  },
  pill: {
    '--radius-sm': '0.75rem',
    '--radius-md': '1.25rem',
    '--radius-lg': '2rem',
    '--radius-xl': '3rem',
  },
};

const SHADOW_MAP: Record<TemplateConfig['style']['shadows'], Record<string, string>> = {
  none: {
    '--shadow-sm': 'none',
    '--shadow-md': 'none',
    '--shadow-lg': 'none',
    '--shadow-xl': 'none',
  },
  subtle: {
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.04)',
    '--shadow-md': '0 2px 8px rgba(0,0,0,0.06)',
    '--shadow-lg': '0 4px 16px rgba(0,0,0,0.08)',
    '--shadow-xl': '0 8px 32px rgba(0,0,0,0.10)',
  },
  medium: {
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.05)',
    '--shadow-md': '0 4px 6px rgba(0,0,0,0.07)',
    '--shadow-lg': '0 10px 25px rgba(0,0,0,0.10)',
    '--shadow-xl': '0 20px 50px rgba(0,0,0,0.15)',
  },
  dramatic: {
    '--shadow-sm': '0 2px 4px rgba(0,0,0,0.12)',
    '--shadow-md': '0 6px 16px rgba(0,0,0,0.18)',
    '--shadow-lg': '0 16px 40px rgba(0,0,0,0.22)',
    '--shadow-xl': '0 32px 80px rgba(0,0,0,0.28)',
  },
};

/**
 * Returns a flat object of CSS custom properties derived from a TemplateConfig.
 * Suitable for spreading into an element's `style` prop.
 */
export function buildTemplateCSSVars(
  config: TemplateConfig,
): Record<string, string> {
  const headingFont =
    FONT_VAR_MAP[config.fonts.heading] ??
    `'${config.fonts.heading}', sans-serif`;
  const bodyFont =
    FONT_VAR_MAP[config.fonts.body] ?? `'${config.fonts.body}', sans-serif`;

  return {
    '--brand-primary': config.colors.primary,
    '--brand-primary-foreground': config.colors.primaryForeground,
    '--brand-secondary': config.colors.secondary,
    '--brand-secondary-foreground': config.colors.secondaryForeground,
    '--brand-accent': config.colors.accent,
    '--brand-accent-foreground': config.colors.accentForeground,
    '--surface-background': config.colors.background,
    '--surface-foreground': config.colors.foreground,
    '--surface-muted': config.colors.muted,
    '--font-heading': headingFont,
    '--font-body': bodyFont,
    '--section-spacing': config.style.sectionSpacing,
    ...BORDER_RADIUS_MAP[config.style.borderRadius],
    ...SHADOW_MAP[config.style.shadows],
  };
}

/**
 * Applies template CSS variables to a DOM element (e.g. document.documentElement).
 * Call from a useEffect in client components.
 */
export function applyTemplateCSSVars(
  config: TemplateConfig,
  element: HTMLElement = document.documentElement,
): void {
  const vars = buildTemplateCSSVars(config);
  Object.entries(vars).forEach(([prop, value]) => {
    element.style.setProperty(prop, value);
  });
}
