export type { TemplateManifest } from './types';
export { templates, getAllTemplates, getTemplate, getTemplatesForCategory } from './registry';
export { buildTemplateCSSVars } from './theme-css';
export {
  mergeField,
  mergeThemeConfig,
  type MergeableBranding,
  type MergeableBrandColors,
  type MergeableBrandFonts,
  type ResolvedTheme,
} from './theme-merge';
