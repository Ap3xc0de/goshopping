/**
 * HSL <-> hex conversions and validation for the "Mi Tienda" color inputs.
 * `isValidHslString` mirrors `validateHSL` in
 * apps/core/internal/models/branding.go exactly (same regex + range
 * checks) so the editor can block an invalid save client-side before the
 * server ever sees it (ADMIN-04).
 */
const HSL_RE = /^(\d{1,3}) (\d{1,3})% (\d{1,3})%$/;

export function isValidHslString(value: string): boolean {
  const m = HSL_RE.exec(value.trim());
  if (!m) return false;
  const h = Number(m[1]);
  const s = Number(m[2]);
  const l = Number(m[3]);
  return h <= 360 && s <= 100 && l <= 100;
}

/** Converts an "H S% L%" string (no hsl() wrapper) into a "#rrggbb" hex string. */
export function hslStringToHex(hsl: string): string {
  const parts = hsl.trim().split(' ');
  if (parts.length !== 3) return '#000000';
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Converts a "#rrggbb" hex string into an "H S% L%" string for BrandColors fields. */
export function hexToHslString(hex: string): string {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '0 0% 0%';

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
