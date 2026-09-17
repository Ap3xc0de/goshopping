import { getAllTemplates, getTemplate } from '../registry';

/**
 * CATALOG-01/CATALOG-02 — single-template rollout: `minimal` is the only
 * active (non-archived) template offered for new stores; the 4 legacy
 * templates (vibrant/elegant/urban/fresh) are archived, NOT deleted, so
 * stores already assigned to one of them keep resolving their theme
 * (rollback safety — reactivating a template is `archived: false` +
 * `npm run generate:catalog`, zero code deletion).
 *
 * Supersedes the old REQ-CATALOG-05 "5 active templates" assertion from the
 * v1-catalog slice — the registry still HOLDS 5 manifests, but only 1 is
 * offered/valid for new assignments (enforced Go-side by
 * apps/core/internal/catalog#IsValid).
 */
describe('template catalog v1 contents — single active template (CATALOG-01, CATALOG-02)', () => {
  const ARCHIVED_IDS = ['elegant', 'fresh', 'urban', 'vibrant'];

  it('the registry still holds exactly 5 manifests (archived ones are kept, not deleted)', () => {
    expect(getAllTemplates()).toHaveLength(5);
  });

  it('includes all 5 legacy ids', () => {
    const ids = getAllTemplates()
      .map((t) => t.id)
      .sort();
    expect(ids).toEqual(['elegant', 'fresh', 'minimal', 'urban', 'vibrant']);
  });

  it('exactly 1 template is active: minimal', () => {
    const active = getAllTemplates().filter((t) => !t.archived);
    expect(active.map((t) => t.id)).toEqual(['minimal']);
  });

  it('exactly 4 templates are archived: vibrant, elegant, urban, fresh', () => {
    const archived = getAllTemplates()
      .filter((t) => t.archived)
      .map((t) => t.id)
      .sort();
    expect(archived).toEqual(ARCHIVED_IDS);
  });

  it.each(ARCHIVED_IDS)('archived template %s remains resolvable by id (rollback safety)', (id) => {
    const template = getTemplate(id);
    expect(template.id).toBe(id);
    expect(template.archived).toBe(true);
    // Rollback safety means the manifest is fully intact, not a stub.
    expect(template.colors.primary).toBeTruthy();
    expect(template.fonts.heading).toBeTruthy();
  });
});
