import { readFileSync } from 'fs';
import { join } from 'path';
import { templates, getAllTemplates, getTemplatesForCategory } from '../registry';
import { buildCatalog } from '../generate-catalog';
import type { TemplateManifest } from '../types';

/**
 * REQ-CATALOG-07 — adding template #6 must cost exactly: (1) a new
 * manifest.ts under registry/<id>/, (2) one line in registry/index.ts,
 * (3) regenerate catalog.json. NO other file (apps/core Go code,
 * apps/admin code, generate-catalog.ts) should need to change.
 *
 * This test protects that property against regression by proving, at
 * runtime, that the registry map is the SINGLE point of registration the
 * rest of the mechanism (getAllTemplates, getTemplatesForCategory,
 * buildCatalog) reads from — and, statically, that neither the generator
 * nor the public index hardcode any of the 5 known template ids (which
 * would mean a 6th template needs a code change beyond a registry line).
 */
describe('adding template #6 (scalability contract, REQ-CATALOG-07)', () => {
  const KNOWN_IDS = ['minimal', 'vibrant', 'elegant', 'urban', 'fresh'];

  const probeManifest: TemplateManifest = {
    id: '__probe__',
    name: 'Probe',
    description: 'Synthetic template used only to prove registry scalability.',
    category: ['__probe-category__'],
    colors: {
      primary: '0 0% 0%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 0%',
      secondaryForeground: '0 0% 100%',
      accent: '0 0% 0%',
      accentForeground: '0 0% 100%',
      background: '0 0% 100%',
      foreground: '0 0% 0%',
      muted: '0 0% 90%',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    components: {
      navbar: 'solid',
      hero: 'centered',
      footer: 'minimal',
      productCard: 'compact',
    },
    homeSections: ['ProductGrid'],
    style: { sectionSpacing: '1rem', borderRadius: 'sharp', shadows: 'none' },
  };

  afterEach(() => {
    delete templates.__probe__;
  });

  it('registering a manifest with a single registry line makes it discoverable by getAllTemplates()', () => {
    const before = getAllTemplates().length;

    templates.__probe__ = probeManifest;

    const after = getAllTemplates();
    expect(after.length).toBe(before + 1);
    expect(after.map((t) => t.id)).toContain('__probe__');
  });

  it('registering a manifest makes it discoverable by getTemplatesForCategory() with zero extra code', () => {
    templates.__probe__ = probeManifest;

    const results = getTemplatesForCategory('__probe-category__');
    expect(results.map((t) => t.id)).toEqual(['__probe__']);
  });

  it('registering a manifest makes it appear in buildCatalog() output with zero changes to the generator', () => {
    templates.__probe__ = probeManifest;

    const catalog = buildCatalog();
    const entry = catalog.templates.find((t) => t.id === '__probe__');
    expect(entry).toEqual(
      expect.objectContaining({
        id: '__probe__',
        name: 'Probe',
        archived: false,
      }),
    );
  });

  it('generate-catalog.ts does not hardcode any of the 5 known template ids', () => {
    const source = readFileSync(join(__dirname, '../generate-catalog.ts'), 'utf-8');
    KNOWN_IDS.forEach((id) => {
      expect(source).not.toContain(`'${id}'`);
      expect(source).not.toContain(`"${id}"`);
    });
  });

  it('the public index.ts does not hardcode any of the 5 known template ids', () => {
    const source = readFileSync(join(__dirname, '../index.ts'), 'utf-8');
    KNOWN_IDS.forEach((id) => {
      expect(source).not.toContain(`'${id}'`);
      expect(source).not.toContain(`"${id}"`);
    });
  });
});
