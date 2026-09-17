import { getTemplate } from '@goshopping/template-catalog';
import type { TemplateManifest } from '@goshopping/template-catalog';

export const DEFAULT_TEMPLATE_ID = 'minimal';

/**
 * REQ-RENDER-05 — a store's `template_id` that isn't in the catalog
 * (corrupt data, or the catalog drifted out of sync with what
 * REQ-CATALOG-04 validated at write time) falls back to the default
 * template. This should never happen in practice — it's defense in depth.
 *
 * A silent fallback would hide that bug forever, so this MUST alert.
 *
 * Scope decision: the design proposes a Go-side
 * `POST /internal/template-fallback-alert` publishing through
 * `EventService`/SQS. That's kept out of this slice to stay minimal — it's
 * a second, protected, internal Go endpoint plus a Next -> Go call for a
 * case that (per REQ-CATALOG-04) should be unreachable in normal
 * operation. The alert here is a structured, `error`-level, server-side
 * log carrying `store_id`/`requested_template_id`/`fallback_template_id` —
 * enough for someone watching storefront logs/alerts to notice and act.
 * What's NOT acceptable is a fallback with no alert at all, silently
 * hiding the bug — that's what this function refuses to do.
 */
export function resolveTemplate(
  templateId: string,
  context: { storeId?: string } = {},
): TemplateManifest {
  try {
    return getTemplate(templateId);
  } catch {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'template_fallback_triggered',
        requested_template_id: templateId,
        fallback_template_id: DEFAULT_TEMPLATE_ID,
        store_id: context.storeId ?? null,
      }),
    );
    return getTemplate(DEFAULT_TEMPLATE_ID);
  }
}
