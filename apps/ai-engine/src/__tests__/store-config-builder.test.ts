import { StoreConfigBuilder } from '../services/store-config-builder';

const builder = new StoreConfigBuilder();

describe('StoreConfigBuilder', () => {
  it('completes partial config with defaults', () => {
    const result = builder.build({});
    expect(result.name).toBe('Mi Tienda');
    expect(result.category).toBe('general');
    expect(result.pages).toEqual(['inicio', 'catalogo']);
  });

  it('default style is minimal', () => {
    const result = builder.build({});
    expect(result.style).toBe('minimal');
  });

  it('default pages includes inicio and catalogo', () => {
    const result = builder.build({});
    expect(result.pages).toContain('inicio');
    expect(result.pages).toContain('catalogo');
  });

  it('keeps provided values without overwriting', () => {
    const result = builder.build({
      name: 'Tienda Test',
      category: 'moda',
      style: 'vibrant',
      tagline: 'Viste diferente',
    });
    expect(result.name).toBe('Tienda Test');
    expect(result.category).toBe('moda');
    expect(result.style).toBe('vibrant');
    expect(result.tagline).toBe('Viste diferente');
  });

  it('generates secondary and accent from primary', () => {
    const result = builder.build({ colors: { primary: '120 50% 50%' } });
    expect(result.colors.primary).toBe('120 50% 50%');
    // Secondary is hue shifted by 180
    expect(result.colors.secondary).toBe('300 50% 50%');
    // Accent is hue shifted by 60
    expect(result.colors.accent).toBe('180 50% 50%');
  });

  it('keeps provided secondary and accent colors', () => {
    const result = builder.build({
      colors: {
        primary: '120 50% 50%',
        secondary: '200 30% 40%',
        accent: '50 80% 60%',
      },
    });
    expect(result.colors.secondary).toBe('200 30% 40%');
    expect(result.colors.accent).toBe('50 80% 60%');
  });

  it('sets logo_url to null when not provided', () => {
    const result = builder.build({});
    expect(result.logo_url).toBeNull();
  });

  it('sets logo_url when provided', () => {
    const result = builder.build({ logo_url: 'https://example.com/logo.png' });
    expect(result.logo_url).toBe('https://example.com/logo.png');
  });
});
