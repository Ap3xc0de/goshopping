import { minimalManifest } from './minimal/manifest';
import { vibrantManifest } from './vibrant/manifest';
import { elegantManifest } from './elegant/manifest';
import { urbanManifest } from './urban/manifest';
import { freshManifest } from './fresh/manifest';
import type { TemplateManifest } from '../types';

/**
 * templates is the single source of truth for the catalog. Adding template
 * #6 costs exactly: (1) a new manifest.ts under registry/<id>/, (2) one line
 * here, (3) regenerate catalog.json — REQ-CATALOG-07.
 */
export const templates: Record<string, TemplateManifest> = {
  minimal: minimalManifest,
  vibrant: vibrantManifest,
  elegant: elegantManifest,
  urban: urbanManifest,
  fresh: freshManifest,
};

/** Returns every registered template, including archived ones. */
export function getAllTemplates(): TemplateManifest[] {
  return Object.values(templates);
}

/**
 * Returns a template manifest by ID.
 * Throws if the ID is not found — mirrors the legacy
 * apps/storefront/src/templates/index.ts#getTemplate behaviour.
 */
export function getTemplate(id: string): TemplateManifest {
  const template = templates[id];
  if (!template) {
    throw new Error(`Template "${id}" not found. Available: ${Object.keys(templates).join(', ')}`);
  }
  return template;
}

/** Returns all templates that include the given industry category. */
export function getTemplatesForCategory(category: string): TemplateManifest[] {
  return getAllTemplates().filter((t) => t.category.includes(category));
}
