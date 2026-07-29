import { buildStoreGenerationPrompt } from '../prompts/store-generator';
import { buildComponentGenerationPrompt } from '../prompts/component-generator';
import { buildStyleGenerationPrompt } from '../prompts/style-generator';

describe('buildStoreGenerationPrompt', () => {
  const baseConfig = {
    name: 'Moda Urbana',
    slug: 'moda-urbana',
    category: 'Moda',
    style: 'vibrant',
    template: 'vibrant',
  };

  test('includes store name in prompt', () => {
    const prompt = buildStoreGenerationPrompt(baseConfig);
    expect(prompt).toContain('Moda Urbana');
  });

  test('includes store slug', () => {
    const prompt = buildStoreGenerationPrompt(baseConfig);
    expect(prompt).toContain('moda-urbana');
  });

  test('includes template reference', () => {
    const prompt = buildStoreGenerationPrompt(baseConfig);
    expect(prompt).toContain('template');
  });

  test('references storefront-sdk', () => {
    const prompt = buildStoreGenerationPrompt(baseConfig);
    expect(prompt).toContain('storefront-sdk');
  });

  test('includes tagline when provided', () => {
    const prompt = buildStoreGenerationPrompt({ ...baseConfig, tagline: 'Viste diferente' });
    expect(prompt).toContain('Viste diferente');
  });

  test('includes color hints when provided', () => {
    const prompt = buildStoreGenerationPrompt({
      ...baseConfig,
      colors: { primary: '#FF5722', secondary: '#FFFFFF' },
    });
    expect(prompt).toContain('#FF5722');
  });

  test('instructs to use design system components', () => {
    const prompt = buildStoreGenerationPrompt(baseConfig);
    expect(prompt).toContain('design system');
  });

  test('instructs to use Next.js App Router', () => {
    const prompt = buildStoreGenerationPrompt(baseConfig);
    expect(prompt).toContain('Next.js');
  });
});

describe('buildComponentGenerationPrompt', () => {
  const baseConfig = {
    componentType: 'navbar',
    storeSlug: 'mi-tienda',
    storeName: 'Mi Tienda',
    storeStyle: 'minimal',
  };

  test('includes component type in prompt', () => {
    const prompt = buildComponentGenerationPrompt(baseConfig);
    expect(prompt).toContain('navbar');
  });

  test('includes store name', () => {
    const prompt = buildComponentGenerationPrompt(baseConfig);
    expect(prompt).toContain('Mi Tienda');
  });

  test('includes store style', () => {
    const prompt = buildComponentGenerationPrompt(baseConfig);
    expect(prompt).toContain('minimal');
  });

  test('includes extra context when provided', () => {
    const prompt = buildComponentGenerationPrompt({
      ...baseConfig,
      context: 'El navbar debe tener un carrito visible',
    });
    expect(prompt).toContain('carrito visible');
  });

  test('references design system', () => {
    const prompt = buildComponentGenerationPrompt(baseConfig);
    expect(prompt).toContain('design system');
  });
});

describe('buildStyleGenerationPrompt', () => {
  const baseConfig = {
    storeName: 'Boutique Elegante',
    storeStyle: 'elegant',
    storeCategory: 'Joyería',
  };

  test('includes store name', () => {
    const prompt = buildStyleGenerationPrompt(baseConfig);
    expect(prompt).toContain('Boutique Elegante');
  });

  test('includes style', () => {
    const prompt = buildStyleGenerationPrompt(baseConfig);
    expect(prompt).toContain('elegant');
  });

  test('includes category', () => {
    const prompt = buildStyleGenerationPrompt(baseConfig);
    expect(prompt).toContain('Joyería');
  });

  test('includes color suggestions when provided', () => {
    const prompt = buildStyleGenerationPrompt({
      ...baseConfig,
      colors: { primary: '#B8860B' },
    });
    expect(prompt).toContain('#B8860B');
  });

  test('references COLOR_ENGINE', () => {
    const prompt = buildStyleGenerationPrompt(baseConfig);
    expect(prompt).toContain('COLOR_ENGINE');
  });

  test('references CSS variables format', () => {
    const prompt = buildStyleGenerationPrompt(baseConfig);
    expect(prompt).toContain('CSS');
  });
});
