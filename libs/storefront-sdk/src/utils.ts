/**
 * Formatea un número como precio en la moneda indicada.
 * Por defecto usa COP con locale es-CO.
 */
export function formatPrice(amount: number, currency: string = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Construye la URL de una imagen.
 * - Si `path` ya es una URL absoluta (http/https), la devuelve sin cambios.
 * - Si es relativa, prepend `baseURL` (o la variable de entorno S3).
 */
export function buildImageURL(path: string, baseURL?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base =
    baseURL ??
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_S3_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ''
      : '');
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

/**
 * Convierte un texto en un slug URL-friendly.
 * Ej: "Camiseta Roja XL" → "camiseta-roja-xl"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // descomponer caracteres con tilde
    .replace(/[\u0300-\u036f]/g, '') // eliminar diacríticos
    .replace(/[^a-z0-9\s-]/g, '') // solo letras, números, espacios, guiones
    .trim()
    .replace(/\s+/g, '-') // espacios → guiones
    .replace(/-+/g, '-'); // múltiples guiones → uno solo
}

/**
 * Trunca un texto al largo máximo indicado, agregando ellipsis si es necesario.
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}
