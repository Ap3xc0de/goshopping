/**
 * Tests for the storefront's consumption of the shared template catalog.
 *
 * Covers:
 * - @goshopping/template-catalog exposes a valid TemplateManifest for every
 *   registered template (storefront-side contract, not a re-test of the
 *   catalog package's own internal tests)
 * - getTemplate() returns the correct template by ID
 * - getTemplatesForCategory() filters correctly
 * - buildTemplateCSSVars() (storefront-only logic) generates the expected
 *   CSS variable map from a catalog manifest
 *
 * Slice 6: the legacy apps/storefront/src/templates/{id}/config.ts registry
 * was archived — this file now exercises the storefront's usage of
 * @goshopping/template-catalog directly instead of the old local registry.
 */

import {
  getAllTemplates,
  getTemplate,
  getTemplatesForCategory,
} from '@goshopping/template-catalog';
import type { TemplateManifest } from '@goshopping/template-catalog';
import { buildTemplateCSSVars } from '@/lib/template-css';

// ── Helpers ───────────────────────────────────────────────────────────────

const ALL_TEMPLATES: TemplateManifest[] = getAllTemplates();

const REQUIRED_COLOR_KEYS: (keyof TemplateManifest['colors'])[] = [
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

const REQUIRED_COMPONENT_KEYS: (keyof TemplateManifest['components'])[] = [
  'navbar',
  'hero',
  'footer',
  'productCard',
];

// ── Template manifest field validation ────────────────────────────────────

describe('Template manifests — required fields', () => {
  ALL_TEMPLATES.forEach((template) => {
    describe(`${template.name} (id: ${template.id})`, () => {
      it('has a non-empty id', () => {
        expect(template.id).toBeTruthy();
        expect(typeof template.id).toBe('string');
      });

      it('has a non-empty name', () => {
        expect(template.name).toBeTruthy();
      });

      it('has a non-empty description', () => {
        expect(template.description).toBeTruthy();
      });

      it('has at least one industry category', () => {
        expect(template.category).toBeInstanceOf(Array);
        expect(template.category.length).toBeGreaterThan(0);
      });

      it('has all required color keys', () => {
        REQUIRED_COLOR_KEYS.forEach((key) => {
          expect(template.colors[key]).toBeTruthy();
        });
      });

      it('has valid font heading and body', () => {
        expect(template.fonts.heading).toBeTruthy();
        expect(template.fonts.body).toBeTruthy();
      });

      it('has all required component variant keys', () => {
        REQUIRED_COMPONENT_KEYS.forEach((key) => {
          expect(template.components[key]).toBeTruthy();
        });
      });

      it('has valid navbar variant', () => {
        expect(['transparent', 'solid', 'floating']).toContain(
          template.components.navbar,
        );
      });

      it('has valid hero variant', () => {
        expect(['centered', 'split', 'slider', 'minimal', 'video']).toContain(
          template.components.hero,
        );
      });

      it('has valid footer variant', () => {
        expect(['full', 'minimal']).toContain(template.components.footer);
      });

      it('has valid productCard variant', () => {
        expect(['compact', 'expanded']).toContain(template.components.productCard);
      });

      it('has at least one homeSections entry', () => {
        expect(template.homeSections).toBeInstanceOf(Array);
        expect(template.homeSections.length).toBeGreaterThan(0);
      });

      it('has valid borderRadius style', () => {
        expect(['sharp', 'rounded', 'pill']).toContain(template.style.borderRadius);
      });

      it('has valid shadows style', () => {
        expect(['none', 'subtle', 'medium', 'dramatic']).toContain(
          template.style.shadows,
        );
      });

      it('has a non-empty sectionSpacing', () => {
        expect(template.style.sectionSpacing).toBeTruthy();
      });
    });
  });
});

// ── getAllTemplates() ─────────────────────────────────────────────────────

describe('getAllTemplates()', () => {
  it('contains all 5 templates', () => {
    expect(getAllTemplates()).toHaveLength(5);
  });

  it('contains each template exactly once', () => {
    const ids = getAllTemplates().map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  it('includes minimal, vibrant, elegant, urban, fresh', () => {
    const ids = new Set(getAllTemplates().map((t) => t.id));
    expect(ids.has('minimal')).toBe(true);
    expect(ids.has('vibrant')).toBe(true);
    expect(ids.has('elegant')).toBe(true);
    expect(ids.has('urban')).toBe(true);
    expect(ids.has('fresh')).toBe(true);
  });
});

// ── getTemplate() ─────────────────────────────────────────────────────────

describe('getTemplate()', () => {
  it('returns the manifest with id "minimal" for id "minimal"', () => {
    expect(getTemplate('minimal').id).toBe('minimal');
  });

  it('returns the manifest with id "vibrant" for id "vibrant"', () => {
    expect(getTemplate('vibrant').id).toBe('vibrant');
  });

  it('returns the manifest with id "elegant" for id "elegant"', () => {
    expect(getTemplate('elegant').id).toBe('elegant');
  });

  it('returns the manifest with id "urban" for id "urban"', () => {
    expect(getTemplate('urban').id).toBe('urban');
  });

  it('returns the manifest with id "fresh" for id "fresh"', () => {
    expect(getTemplate('fresh').id).toBe('fresh');
  });

  it('returns the same reference on repeated calls (referential stability)', () => {
    expect(getTemplate('minimal')).toBe(getTemplate('minimal'));
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

// ── buildTemplateCSSVars() ────────────────────────────────────────────────

describe('buildTemplateCSSVars()', () => {
  it('returns an object with --brand-primary', () => {
    const vars = buildTemplateCSSVars(getTemplate('minimal'));
    expect(vars['--brand-primary']).toBeDefined();
    expect(vars['--brand-primary']).toBe(getTemplate('minimal').colors.primary);
  });

  it('returns --brand-accent matching manifest accent color', () => {
    const vars = buildTemplateCSSVars(getTemplate('vibrant'));
    expect(vars['--brand-accent']).toBe(getTemplate('vibrant').colors.accent);
  });

  it('returns --section-spacing matching manifest', () => {
    const vars = buildTemplateCSSVars(getTemplate('minimal'));
    expect(vars['--section-spacing']).toBe(getTemplate('minimal').style.sectionSpacing);
  });

  it('maps Playfair Display font to --font-playfair-display var', () => {
    const vars = buildTemplateCSSVars(getTemplate('minimal'));
    expect(vars['--font-heading']).toContain('--font-playfair-display');
  });

  it('maps Bebas Neue font to --font-bebas-neue var', () => {
    const vars = buildTemplateCSSVars(getTemplate('urban'));
    expect(vars['--font-heading']).toContain('--font-bebas-neue');
  });

  it('applies sharp radius values for "sharp" borderRadius', () => {
    const vars = buildTemplateCSSVars(getTemplate('minimal')); // sharp
    expect(vars['--radius-md']).toBe('0.25rem');
  });

  it('applies pill radius values for "pill" borderRadius', () => {
    const vars = buildTemplateCSSVars(getTemplate('fresh')); // pill
    expect(vars['--radius-md']).toBe('1.25rem');
  });

  it('applies none shadow values for "none" shadows', () => {
    const vars = buildTemplateCSSVars(getTemplate('minimal')); // none
    expect(vars['--shadow-md']).toBe('none');
  });

  it('applies non-none shadow values for "dramatic" shadows', () => {
    const vars = buildTemplateCSSVars(getTemplate('urban')); // dramatic
    expect(vars['--shadow-md']).not.toBe('none');
  });

  it('returns all required CSS variable keys', () => {
    const vars = buildTemplateCSSVars(getTemplate('elegant'));
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
