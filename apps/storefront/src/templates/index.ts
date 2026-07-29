import { minimalConfig } from './minimal/config';
import { vibrantConfig } from './vibrant/config';
import { elegantConfig } from './elegant/config';
import { urbanConfig } from './urban/config';
import { freshConfig } from './fresh/config';
import type { TemplateConfig } from './types';

export type { TemplateConfig };

export { minimalConfig, vibrantConfig, elegantConfig, urbanConfig, freshConfig };

export const templates: Record<string, TemplateConfig> = {
  minimal: minimalConfig,
  vibrant: vibrantConfig,
  elegant: elegantConfig,
  urban: urbanConfig,
  fresh: freshConfig,
};

export const templateList: TemplateConfig[] = Object.values(templates);

/**
 * Returns a template config by ID.
 * Throws if the ID is not found.
 */
export function getTemplate(id: string): TemplateConfig {
  const template = templates[id as keyof typeof templates];
  if (!template) {
    throw new Error(`Template "${id}" not found. Available: ${Object.keys(templates).join(', ')}`);
  }
  return template;
}

/**
 * Returns all templates that include the given industry category.
 */
export function getTemplatesForCategory(category: string): TemplateConfig[] {
  return templateList.filter((t) => t.category.includes(category));
}

/**
 * Returns all unique industry categories across all templates.
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  templateList.forEach((t) => t.category.forEach((c) => categories.add(c)));
  return Array.from(categories).sort();
}
