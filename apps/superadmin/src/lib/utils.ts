import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AccountStatus, StoreStatus, IntegrationStatus } from './types';

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

// ─── Status colors ───────────────────────────────────────────────────────────

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

export function accountStatusColor(status: AccountStatus): BadgeVariant {
  switch (status) {
    case 'active':    return 'green';
    case 'pending':   return 'yellow';
    case 'suspended': return 'red';
    default:          return 'gray';
  }
}

export function storeStatusColor(status: StoreStatus): BadgeVariant {
  switch (status) {
    case 'active':    return 'green';
    case 'inactive':  return 'gray';
    case 'suspended': return 'red';
    default:          return 'gray';
  }
}

export function integrationStatusColor(status: IntegrationStatus): BadgeVariant {
  switch (status) {
    case 'healthy':  return 'green';
    case 'degraded': return 'yellow';
    case 'down':     return 'red';
    default:         return 'gray';
  }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}
