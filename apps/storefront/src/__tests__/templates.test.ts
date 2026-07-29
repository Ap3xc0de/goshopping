/**
 * Tests for the storefront template system.
 *
 * Covers:
 * - Each config exports a valid TemplateConfig with all required fields
 * - getTemplate() returns the correct template by ID
 * - getTemplatesForCategory() filters correctly
 * - buildTemplateCSSVars() generates the expected CSS variable map
 */

import {
  minimalConfig,
  vibrantConfig,
  elegantConfig,
  urbanConfig,
  freshConfig,
  templateList,
  getTemplate,
  getTemplatesForCategory,
  getAllCategories,
} from '@/templates';
import type { TemplateConfig } from '@/templates/types';
import { buildTemplateCSSVars } from '@/lib/template-css';

// ── Helpers ───────────────────────────────────────────────────────────────

const ALL_CONFIGS: TemplateConfig[] = [
  minimalConfig,
  vibrantConfig,
  elegantConfig,
  urbanConfig,
  freshConfig,
];

const REQUIRED_COLOR_KEYS: (keyof TemplateConfig['colors'])[] = [
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'background',
  'foreground',
  'muted',
];

const REQUIRED_COMPONENT_KEYS: (keyof TemplateConfig['components'])[] = [
  'navbar',
  'hero',
  'footer',
  'productCard',
];

// ── Template config field validation ─────────────────────────────────────

describe('Template configs — required fields', () => {
  ALL_CONFIGS.forEach((config) => {
    describe(`${config.name} (id: ${config.id})`, () => {
      it('has a non-empty id', () => {
        expect(config.id).toBeTruthy();
        expect(typeof config.id).toBe('string');
      });

      it('has a non-empty name', () => {
        expect(config.name).toBeTruthy();
      });

      it('has a non-empty description', () => {
        expect(config.description).toBeTruthy();
      });

      it('has at least one industry category', () => {
        expect(config.category).toBeInstanceOf(Array);
        expect(config.category.length).toBeGreaterThan(0);
      });

      it('has all required color keys', () => {
        REQUIRED_COLOR_KEYS.forEach((key) => {
          expect(config.colors[key]).toBeTruthy();
        });
      });

      it('has valid font heading and body', () => {
        expect(config.fonts.heading).toBeTruthy();
        expect(config.fonts.body).toBeTruthy();
      });

      it('has all required component variant keys', () => {
        REQUIRED_COMPONENT_KEYS.forEach((key) => {
          expect(config.components[key]).toBeTruthy();
        });
      });

      it('has valid navbar variant', () => {
        expect(['transparent', 'solid', 'floating']).toContain(
          config.components.navbar,
        );
      });

      it('has valid hero variant', () => {
        expect(['centered', 'split', 'slider', 'minimal', 'video']).toContain(
          config.components.hero,
        );
      });

      it('has valid footer variant', () => {
        expect(['full', 'minimal']).toContain(config.components.footer);
      });

      it('has valid productCard variant', () => {
        expect(['compact', 'expanded']).toContain(config.components.productCard);
      });

      it('has at least one homeSections entry', () => {
        expect(config.homeSections).toBeInstanceOf(Array);
        expect(config.homeSections.length).toBeGreaterThan(0);
      });

      it('has valid borderRadius style', () => {
        expect(['sharp', 'rounded', 'pill']).toContain(config.style.borderRadius);
      });

      it('has valid shadows style', () => {
        expect(['none', 'subtle', 'medium', 'dramatic']).toContain(
          config.style.shadows,
        );
      });

      it('has a non-empty sectionSpacing', () => {
        expect(config.style.sectionSpacing).toBeTruthy();
      });
    });
  });
});

// ── templateList ──────────────────────────────────────────────────────────

describe('templateList', () => {
  it('contains all 5 templates', () => {
    expect(templateList).toHaveLength(5);
  });

  it('contains each template exactly once', () => {
    const ids = templateList.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  it('includes minimal, vibrant, elegant, urban, fresh', () => {
    const ids = new Set(templateList.map((t) => t.id));
    expect(ids.has('minimal')).toBe(true);
    expect(ids.has('vibrant')).toBe(true);
    expect(ids.has('elegant')).toBe(true);
    expect(ids.has('urban')).toBe(true);
    expect(ids.has('fresh')).toBe(true);
  });
});

// ── getTemplate() ─────────────────────────────────────────────────────────

describe('getTemplate()', () => {
  it('returns minimalConfig for id "minimal"', () => {
    expect(getTemplate('minimal')).toBe(minimalConfig);
  });

  it('returns vibrantConfig for id "vibrant"', () => {
    expect(getTemplate('vibrant')).toBe(vibrantConfig);
  });

  it('returns elegantConfig for id "elegant"', () => {
    expect(getTemplate('elegant')).toBe(elegantConfig);
  });

  it('returns urbanConfig for id "urban"', () => {
    expect(getTemplate('urban')).toBe(urbanConfig);
  });

  it('returns freshConfig for id "fresh"', () => {
    expect(getTemplate('fresh')).toBe(freshConfig);
  });

  it('throws for an unknown id', () => {
    expect(() => getTemplate('nonexistent')).toThrow();
  });

  it('throw message mentions the unknown id', () => {
    expect(() => getTemplate('unknown-id')).toThrow(/unknown-id/);
  });
});

// ── getTemplatesForCategory() ─────────────────────────────────────────────

describe('getTemplatesForCategory()', () => {
  it('returns templates that match an exact category string', () => {
    const results = getTemplatesForCategory('Deportes');
    expect(results.length).toBeGreaterThan(0);
    results.forEach((t) => expect(t.category).toContain('Deportes'));
  });

  it('returns vibrant for "Deportes"', () => {
    const ids = getTemplatesForCategory('Deportes').map((t) => t.id);
    expect(ids).toContain('vibrant');
  });

  it('returns minimal for "Joyería"', () => {
    const ids = getTemplatesForCategory('Joyería').map((t) => t.id);
    expect(ids).toContain('minimal');
  });

  it('returns elegant for "Vinos"', () => {
    const ids = getTemplatesForCategory('Vinos').map((t) => t.id);
    expect(ids).toContain('elegant');
  });

  it('returns urban for "Sneakers"', () => {
    const ids = getTemplatesForCategory('Sneakers').map((t) => t.id);
    expect(ids).toContain('urban');
  });

  it('returns fresh for "Mascotas"', () => {
    const ids = getTemplatesForCategory('Mascotas').map((t) => t.id);
    expect(ids).toContain('fresh');
  });

  it('returns empty array for a category with no match', () => {
    const results = getTemplatesForCategory('__nonexistent__');
    expect(results).toEqual([]);
  });
});

// ── getAllCategories() ────────────────────────────────────────────────────

describe('getAllCategories()', () => {
  it('returns a non-empty sorted array', () => {
    const cats = getAllCategories();
    expect(cats.length).toBeGreaterThan(0);
    for (let i = 1; i < cats.length; i++) {
      expect(cats[i] >= cats[i - 1]).toBe(true);
    }
  });

  it('has no duplicates', () => {
    const cats = getAllCategories();
    expect(cats.length).toBe(new Set(cats).size);
  });
});

// ── buildTemplateCSSVars() ────────────────────────────────────────────────

describe('buildTemplateCSSVars()', () => {
  it('returns an object with --brand-primary', () => {
    const vars = buildTemplateCSSVars(minimalConfig);
    expect(vars['--brand-primary']).toBeDefined();
    expect(vars['--brand-primary']).toBe(minimalConfig.colors.primary);
  });

  it('returns --brand-accent matching config accent color', () => {
    const vars = buildTemplateCSSVars(vibrantConfig);
    expect(vars['--brand-accent']).toBe(vibrantConfig.colors.accent);
  });

  it('returns --section-spacing matching config', () => {
    const vars = buildTemplateCSSVars(minimalConfig);
    expect(vars['--section-spacing']).toBe(minimalConfig.style.sectionSpacing);
  });

  it('maps Playfair Display font to --font-playfair-display var', () => {
    const vars = buildTemplateCSSVars(minimalConfig);
    expect(vars['--font-heading']).toContain('--font-playfair-display');
  });

  it('maps Bebas Neue font to --font-bebas-neue var', () => {
    const vars = buildTemplateCSSVars(urbanConfig);
    expect(vars['--font-heading']).toContain('--font-bebas-neue');
  });

  it('applies sharp radius values for "sharp" borderRadius', () => {
    const vars = buildTemplateCSSVars(minimalConfig); // sharp
    expect(vars['--radius-md']).toBe('0.25rem');
  });

  it('applies pill radius values for "pill" borderRadius', () => {
    const vars = buildTemplateCSSVars(freshConfig); // pill
    expect(vars['--radius-md']).toBe('1.25rem');
  });

  it('applies none shadow values for "none" shadows', () => {
    const vars = buildTemplateCSSVars(minimalConfig); // none
    expect(vars['--shadow-md']).toBe('none');
  });

  it('applies non-none shadow values for "dramatic" shadows', () => {
    const vars = buildTemplateCSSVars(urbanConfig); // dramatic
    expect(vars['--shadow-md']).not.toBe('none');
  });

  it('returns all required CSS variable keys', () => {
    const vars = buildTemplateCSSVars(elegantConfig);
    const requiredKeys = [
      '--brand-primary',
      '--brand-primary-foreground',
      '--brand-secondary',
      '--brand-secondary-foreground',
      '--brand-accent',
      '--brand-accent-foreground',
      '--surface-background',
      '--surface-foreground',
      '--surface-muted',
      '--font-heading',
      '--font-body',
      '--section-spacing',
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--radius-xl',
      '--shadow-sm',
      '--shadow-md',
      '--shadow-lg',
      '--shadow-xl',
    ];
    requiredKeys.forEach((key) => {
      expect(vars[key]).toBeDefined();
    });
  });
});
