/**
 * BRAND-07: the storefront's static next/font/google map (root layout) must
 * cover the full Go AllowedFonts list — Poppins/Outfit are valid in Go
 * (branding.go#AllowedFonts) but had no next/font/google loader here before
 * this change, so a store branded with them would silently fall back to the
 * generic `'Poppins', sans-serif` string instead of the actual optimized font.
 *
 * Next's jest transform mocks `next/font/google` to a generic placeholder
 * (it never returns the real `--font-x` variable name under jsdom), so
 * asserting on a rendered <body> className can't tell "Poppins wired up"
 * apart from "Poppins missing". Reading the source file directly — the same
 * technique `storeLayoutServer.test.tsx` uses for its "no useEffect" check —
 * is the reliable way to assert this static wiring.
 */
import { readFileSync } from 'fs';
import path from 'path';

const source = readFileSync(
  path.join(__dirname, '..', 'app', 'layout.tsx'),
  'utf-8',
);

describe('RootLayout fonts (BRAND-07)', () => {
  it('imports Poppins from next/font/google', () => {
    expect(source).toMatch(/Poppins/);
  });

  it('imports Outfit from next/font/google', () => {
    expect(source).toMatch(/Outfit/);
  });

  it('declares --font-poppins as a font variable', () => {
    expect(source).toContain('variable: "--font-poppins"');
  });

  it('declares --font-outfit as a font variable', () => {
    expect(source).toContain('variable: "--font-outfit"');
  });

  it('includes the poppins/outfit variables in the fontVariables list applied to <body>', () => {
    expect(source).toMatch(/poppins\.variable/);
    expect(source).toMatch(/outfit\.variable/);
  });

  it('still declares the pre-existing 9 font variables', () => {
    [
      '--font-inter',
      '--font-playfair-display',
      '--font-space-grotesk',
      '--font-cormorant-garamond',
      '--font-lora',
      '--font-bebas-neue',
      '--font-dm-sans',
      '--font-nunito',
      '--font-nunito-sans',
    ].forEach((cssVar) => expect(source).toContain(cssVar));
  });
});
