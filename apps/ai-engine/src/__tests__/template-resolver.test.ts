import { TemplateResolver } from '../services/template-resolver';

const resolver = new TemplateResolver();

describe('TemplateResolver', () => {
  it('selects minimal for joyería', () => {
    expect(resolver.resolve('joyeria').template).toBe('elegant');
    expect(resolver.resolve('joyería').template).toBe('elegant');
  });

  it('selects vibrant for deportes', () => {
    expect(resolver.resolve('deportes').template).toBe('vibrant');
  });

  it('selects vibrant for tecnología', () => {
    expect(resolver.resolve('tecnologia').template).toBe('vibrant');
    expect(resolver.resolve('tecnología').template).toBe('vibrant');
  });

  it('selects elegant for lujo', () => {
    expect(resolver.resolve('lujo').template).toBe('elegant');
  });

  it('selects urban for streetwear', () => {
    expect(resolver.resolve('streetwear').template).toBe('urban');
  });

  it('selects fresh for alimentos', () => {
    expect(resolver.resolve('alimentos').template).toBe('fresh');
  });

  it('selects fresh for mascotas', () => {
    expect(resolver.resolve('mascotas').template).toBe('fresh');
  });

  it('returns minimal as default for unknown category', () => {
    expect(resolver.resolve('desconocido').template).toBe('minimal');
    expect(resolver.resolve('').template).toBe('minimal');
  });

  it('resolveFromStyle returns the style if valid', () => {
    expect(resolver.resolveFromStyle('vibrant')).toBe('vibrant');
    expect(resolver.resolveFromStyle('elegant')).toBe('elegant');
  });

  it('resolveFromStyle returns minimal for invalid style', () => {
    expect(resolver.resolveFromStyle('invalid')).toBe('minimal');
    expect(resolver.resolveFromStyle('')).toBe('minimal');
  });
});
