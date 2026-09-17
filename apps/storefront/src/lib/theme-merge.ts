/**
 * Re-exports the shared merge logic from `@goshopping/template-catalog`
 * (design decision 11 of sdd/storefront-single-template-ecommerce, Slice 8
 * — moved out of this file so apps/admin's "Mi Tienda" live preview can use
 * the exact same merge behavior without depending on the storefront SDK).
 * `StoreBranding` (from `@goshopping/storefront-sdk/client`) satisfies the
 * shared package's structural `MergeableBranding` shape, so every existing
 * call site here keeps compiling and behaving identically.
 */
export { mergeField, mergeThemeConfig, type ResolvedTheme } from '@goshopping/template-catalog';
