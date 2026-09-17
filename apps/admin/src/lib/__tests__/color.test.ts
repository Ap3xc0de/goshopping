import { hexToHslString, hslStringToHex, isValidHslString } from '../color';

describe('isValidHslString', () => {
  it('accepts the "H S% L%" format Go\'s validateHSL expects', () => {
    expect(isValidHslString('142 71% 45%')).toBe(true);
    expect(isValidHslString('0 0% 100%')).toBe(true);
    expect(isValidHslString('360 100% 100%')).toBe(true);
  });

  it('rejects hex, hsl() wrapper, and out-of-range values', () => {
    expect(isValidHslString('#fff')).toBe(false);
    expect(isValidHslString('hsl(142, 71%, 45%)')).toBe(false);
    expect(isValidHslString('361 71% 45%')).toBe(false);
    expect(isValidHslString('142 101% 45%')).toBe(false);
    expect(isValidHslString('')).toBe(false);
  });
});

describe('hexToHslString / hslStringToHex round-trip', () => {
  it('converts pure black/white correctly', () => {
    expect(hexToHslString('#000000')).toBe('0 0% 0%');
    expect(hexToHslString('#ffffff')).toBe('0 0% 100%');
  });

  it('round-trips a color within a small tolerance (integer HSL rounding is lossy by design)', () => {
    const hex = '#3b82f6';
    const hsl = hexToHslString(hex);
    expect(isValidHslString(hsl)).toBe(true);
    const back = hslStringToHex(hsl);
    // Rounding H/S/L to whole numbers can shift each RGB channel by a
    // couple of units — assert "visually the same color", not bit-exact.
    const toRgb = (h: string) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16));
    const [r1, g1, b1] = toRgb(hex);
    const [r2, g2, b2] = toRgb(back);
    expect(Math.abs(r1 - r2)).toBeLessThanOrEqual(2);
    expect(Math.abs(g1 - g2)).toBeLessThanOrEqual(2);
    expect(Math.abs(b1 - b2)).toBeLessThanOrEqual(2);
  });

  it('hslStringToHex converts a known HSL triplet to its hex equivalent', () => {
    expect(hslStringToHex('0 0% 9%')).toBe('#171717');
  });
});
