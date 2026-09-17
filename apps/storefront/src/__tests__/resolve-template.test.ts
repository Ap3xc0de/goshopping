/**
 * REQ-RENDER-05 — template_id desconocido en runtime. Defense in depth: this
 * should never happen if REQ-CATALOG-04 (Go validates template_id on
 * PUT /stores/:storeId/template) holds, but a silent fallback would hide a
 * data-corruption or catalog-drift bug forever, so a fallback MUST alert.
 *
 * Scope note (see apply-progress for the full rationale): the design
 * proposes a Go-side POST /internal/template-fallback-alert publishing via
 * EventService/SQS. Kept out of this slice to stay minimal — the alert
 * here is a structured server-side error log with store_id/template_id,
 * which is what this test asserts.
 */
import { getTemplate } from '@goshopping/template-catalog';
import { DEFAULT_TEMPLATE_ID, resolveTemplate } from '@/lib/resolve-template';

describe('resolveTemplate', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns the requested template when it exists in the catalog', () => {
    const template = resolveTemplate('vibrant');
    expect(template).toEqual(getTemplate('vibrant'));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('falls back to the default template when template_id is unknown', () => {
    const template = resolveTemplate('no-existe');
    expect(template).toEqual(getTemplate(DEFAULT_TEMPLATE_ID));
  });

  it('logs a structured error alert (not a silent fallback) with store_id and both template ids', () => {
    resolveTemplate('no-existe', { storeId: 'store-123' });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({
      level: 'error',
      event: 'template_fallback_triggered',
      requested_template_id: 'no-existe',
      fallback_template_id: DEFAULT_TEMPLATE_ID,
      store_id: 'store-123',
    });
  });

  it('logs store_id as null when no context is provided', () => {
    resolveTemplate('no-existe');
    const logged = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
    expect(logged.store_id).toBeNull();
  });
});
