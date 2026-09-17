import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A server component (e.g. the storefront [storeSlug]/layout.tsx) must be
 * able to import GoShoppingClient without pulling in hooks.ts, which is
 * 'use client'. Today the barrel (./src/index.ts) re-exports both together,
 * so any consumer of the package root drags the client-only hooks along.
 *
 * The `exports` map below is the mitigation: server components import from
 * the `./client` subpath instead of the barrel. Existing client components
 * keep using the barrel unchanged — this is additive, not a breaking change.
 */
describe('storefront-sdk package exports map', () => {
  function readPackageJson(): Record<string, unknown> {
    const raw = readFileSync(join(__dirname, '../../package.json'), 'utf-8');
    return JSON.parse(raw);
  }

  it('declares an exports map with the barrel, client, hooks, and errors subpaths', () => {
    const pkg = readPackageJson();
    // "./errors" (Slice 5, CART/PRODUCT wiring): lets consumer-side jest
    // mocks of the barrel re-export the real error classes (e.g. StockError)
    // via `export { StockError } from '@goshopping/storefront-sdk/errors'`
    // without dragging in hooks.ts — same rationale as "./client" above.
    expect(pkg.exports).toEqual({
      '.': './src/index.ts',
      './client': './src/client.ts',
      './hooks': './src/hooks.ts',
      './errors': './src/errors.ts',
    });
  });
});
