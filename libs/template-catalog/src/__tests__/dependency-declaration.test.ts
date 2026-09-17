import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * REQ-CATALOG-01 — libs/template-catalog must be a declared `file:`
 * dependency of both apps/storefront and apps/admin, the same mechanism
 * already proven by @goshopping/storefront-sdk (apps/storefront/package.json
 * line 15). apps/admin has no local dependency at all today — this is the
 * first one.
 */
describe('template-catalog shared dependency', () => {
  function readPackageJson(appDir: string): Record<string, unknown> {
    const raw = readFileSync(join(__dirname, '../../../../apps', appDir, 'package.json'), 'utf-8');
    return JSON.parse(raw);
  }

  it('apps/storefront package.json declares a file: dependency on template-catalog', () => {
    const pkg = readPackageJson('storefront');
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['@goshopping/template-catalog']).toBe('file:../../libs/template-catalog');
  });

  it('apps/admin package.json declares a file: dependency on template-catalog', () => {
    const pkg = readPackageJson('admin');
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['@goshopping/template-catalog']).toBe('file:../../libs/template-catalog');
  });
});
