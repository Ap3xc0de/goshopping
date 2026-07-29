import { formatPrice, buildImageURL, slugify, truncate } from '../utils';

describe('utils', () => {
  // ── formatPrice ─────────────────────────────────────────────────────────────

  describe('formatPrice', () => {
    it('formatea COP correctamente', () => {
      // Intl en Node puede usar . o ' como separador de miles según la versión
      expect(formatPrice(59900)).toMatch(/59[.,\s]?900/);
      expect(formatPrice(1500000)).toMatch(/1[.,\s]?500[.,\s]?000/);
    });

    it('formatea USD', () => {
      const result = formatPrice(99.99, 'USD');
      expect(result).toMatch(/99/);
    });

    it('formatea 0 sin error', () => {
      expect(() => formatPrice(0)).not.toThrow();
    });
  });

  // ── buildImageURL ───────────────────────────────────────────────────────────

  describe('buildImageURL', () => {
    it('maneja URLs absolutas (https)', () => {
      const url = 'https://cdn.example.com/img/producto.jpg';
      expect(buildImageURL(url)).toBe(url);
    });

    it('maneja URLs absolutas (http)', () => {
      const url = 'http://localhost:9000/bucket/img.png';
      expect(buildImageURL(url)).toBe(url);
    });

    it('prepend baseURL a paths relativos', () => {
      const result = buildImageURL('/images/producto.jpg', 'https://api.goshopping.com');
      expect(result).toBe('https://api.goshopping.com/images/producto.jpg');
    });

    it('no duplica slash al concatenar', () => {
      const result = buildImageURL('/img/foto.jpg', 'https://cdn.test.com/');
      expect(result).toBe('https://cdn.test.com/img/foto.jpg');
    });

    it('maneja path vacío', () => {
      expect(buildImageURL('')).toBe('');
    });
  });

  // ── slugify ──────────────────────────────────────────────────────────────────

  describe('slugify', () => {
    it('genera slugs válidos', () => {
      expect(slugify('Camiseta Roja XL')).toBe('camiseta-roja-xl');
    });

    it('elimina caracteres especiales', () => {
      expect(slugify('¡Hola! ¿Cómo estás?')).toBe('hola-como-estas');
    });

    it('elimina acentos', () => {
      expect(slugify('niño muñeca café')).toBe('nino-muneca-cafe');
    });

    it('colapsa múltiples guiones', () => {
      expect(slugify('precio  muy  bajo')).toBe('precio-muy-bajo');
    });

    it('maneja texto vacío', () => {
      expect(slugify('')).toBe('');
    });
  });

  // ── truncate ─────────────────────────────────────────────────────────────────

  describe('truncate', () => {
    it('corta con ellipsis cuando excede el límite', () => {
      const result = truncate('Este es un texto muy largo', 10);
      expect(result).toHaveLength(11); // 10 chars + ellipsis (…)
      expect(result).toMatch(/…$/);
    });

    it('no corta si el texto cabe', () => {
      expect(truncate('Corto', 10)).toBe('Corto');
    });

    it('no corta si texto === maxLength', () => {
      expect(truncate('12345', 5)).toBe('12345');
    });

    it('maneja string vacío', () => {
      expect(truncate('', 10)).toBe('');
    });
  });
});
