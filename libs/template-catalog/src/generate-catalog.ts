import { writeFileSync } from 'fs';
import { join } from 'path';
import { getAllTemplates } from './registry';
import type { TemplateManifest } from './types';

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  category: string[];
  preview_image: string | null;
  archived: boolean;
}

export interface CatalogFile {
  templates: CatalogEntry[];
}

function toCatalogEntry(t: TemplateManifest): CatalogEntry {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    preview_image: t.preview_image ?? null,
    archived: t.archived ?? false,
  };
}

/** Pure builder: the same registered manifests always produce the same object. */
export function buildCatalog(): CatalogFile {
  return { templates: getAllTemplates().map(toCatalogEntry) };
}

/** Serializes the catalog exactly as it gets written to disk. */
export function serializeCatalog(catalog: CatalogFile): string {
  return JSON.stringify(catalog, null, 2) + '\n';
}

/**
 * Writes the same JSON string to every destination path given.
 *
 * Exported separately from the CLI entry point below so tests can point it
 * at a temp directory instead of the real, committed catalog.json files.
 */
export function writeCatalogTo(json: string, destinations: string[]): void {
  destinations.forEach((dest) => writeFileSync(dest, json));
}

// CLI entry point (`npm run generate:catalog`) — writes the two real
// destinations committed to the repo:
//   1. libs/template-catalog/catalog.json — source of truth for TS
//      consumers (apps/storefront, apps/admin) via `file:` dependency.
//   2. apps/core/catalog.json — a physical copy, because apps/core/Dockerfile
//      uses apps/core/ as its Docker build context (see
//      .github/workflows/core.yml) and COPY cannot reach outside it into
//      libs/. A symlink was rejected: it does not survive `git checkout` on
//      Windows without extra config, and Docker COPY does not reliably
//      follow links that point outside the build context.
// Both writes come from the same `json` string, so the two files can never
// diverge in format — only in whether someone forgot to regenerate them,
// which the CI gate (REQ-CATALOG-03) catches via `git diff --exit-code`.
if (require.main === module) {
  const json = serializeCatalog(buildCatalog());
  writeCatalogTo(json, [
    join(__dirname, '../catalog.json'),
    join(__dirname, '../../../apps/core/catalog.json'),
  ]);
  // eslint-disable-next-line no-console
  console.log('catalog.json written to libs/template-catalog/ and apps/core/');
}
