import type { Locale } from '@/lib/i18n/dictionaries';

export function formatPrice(amount: number, locale: Locale, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function truncate(text: string, n: number): string {
  if (text.length <= n) return text;
  return text.slice(0, n).trimEnd() + '…';
}
