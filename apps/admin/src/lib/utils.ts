import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { OrderStatus } from './types';

// ─── Currency ────────────────────────────────────────────────────────────────

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return copFormatter.format(value);
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

const numberFormatter = new Intl.NumberFormat('es-CO');

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

// ─── Dates ───────────────────────────────────────────────────────────────────

export function formatDate(isoString: string): string {
  try {
    return format(parseISO(isoString), 'dd/MM/yyyy', { locale: es });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    return format(parseISO(isoString), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return isoString;
  }
}

export function timeAgo(isoString: string): string {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true, locale: es });
  } catch {
    return isoString;
  }
}

// ─── Order Status ─────────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   'Pendiente',
  paid:      'Pagado',
  preparing: 'En preparación',
  shipped:   'Despachado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  paid:      'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  shipped:   'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const ORDER_NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:   'paid',
  paid:      'preparing',
  preparing: 'shipped',
  shipped:   'delivered',
};

export const ORDER_NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  pending:   'Confirmar pago',
  paid:      'Preparar',
  preparing: 'Despachar',
  shipped:   'Confirmar entrega',
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '' && v !== null,
  );
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function calculateTax(subtotal: number, rate = 0.19): number {
  return Math.round(subtotal * rate);
}
