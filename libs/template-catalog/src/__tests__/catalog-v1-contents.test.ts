import { getAllTemplates } from '../registry';

/**
 * REQ-CATALOG-05 — the v1 catalog must contain exactly the 5 legacy
 * templates, ported 1:1 from apps/storefront/src/templates/{id}/config.ts,
 * all active (none archived). Slice 5 only ported `minimal` as the mechanism
 * reference; Slice 6 ports the remaining 4 (vibrant, elegant, urban, fresh).
 */
describe('template catalog v1 contents (REQ-CATALOG-05)', () => {
  it('lists exactly 5 templates', () => {
    expect(getAllTemplates()).toHaveLength(5);
  });

  it('includes all 5 legacy ids as active', () => {
    const ids = getAllTemplates()
      .map((t) => t.id)
      .sort();
    expect(ids).toEqual(['elegant', 'fresh', 'minimal', 'urban', 'vibrant']);
  });

  it('none of the 5 templates is marked archived', () => {
    getAllTemplates().forEach((t) => expect(t.archived).toBeFalsy());
  });
});
