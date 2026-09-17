import { getAllTemplates, getTemplate, getTemplatesForCategory } from '../registry';

describe('template-catalog registry', () => {
  it('lists at least the reference template', () => {
    const templates = getAllTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(1);
    expect(templates.map((t) => t.id)).toContain('minimal');
  });

  it('getTemplate returns the manifest for a known id', () => {
    const template = getTemplate('minimal');
    expect(template.id).toBe('minimal');
    expect(template.name).toBeTruthy();
    expect(template.colors.primary).toBeTruthy();
    expect(template.fonts.heading).toBeTruthy();
    expect(template.components.navbar).toBeTruthy();
    expect(template.homeSections.length).toBeGreaterThan(0);
    expect(template.style.borderRadius).toBeTruthy();
  });

  it('getTemplate throws for an unknown id', () => {
    expect(() => getTemplate('does-not-exist')).toThrow(/not found/i);
  });

  // CATALOG-01: minimal is the only active template post single-template
  // rollout — see catalog-v1-contents.test.ts for the full active/archived
  // breakdown of all 5 registered manifests.
  it('minimal is not archived', () => {
    expect(getTemplate('minimal').archived).toBeFalsy();
  });

  it('getTemplatesForCategory filters by category membership', () => {
    const reference = getTemplate('minimal');
    const [category] = reference.category;
    const results = getTemplatesForCategory(category);
    expect(results.map((t) => t.id)).toContain('minimal');
    expect(getTemplatesForCategory('categoria-inexistente')).toEqual([]);
  });

  // BRAND-03/BRAND-05: TemplateManifest.colors gains optional navBackground/
  // navText; the reference `minimal` template ships sensible defaults
  // (white bg / dark text) matching its current hardcoded Navbar look
  // (background/foreground below already are '0 0% 100%'/'0 0% 9%').
  it('minimal template declares navBackground/navText matching its current white-nav look', () => {
    const minimal = getTemplate('minimal');
    expect(minimal.colors.navBackground).toBe('0 0% 100%');
    expect(minimal.colors.navText).toBe('0 0% 9%');
  });

  // CATALOG-01/CATALOG-02: single-template rollout archives vibrant/elegant/
  // urban/fresh instead of deleting them, so a future rollback only flips
  // `archived` back to false + regenerates catalog.json (no code deletion,
  // no data migration for stores already assigned to one of them).
  it('getTemplate still resolves an archived template by id (rollback safety)', () => {
    const archived = getTemplate('vibrant');
    expect(archived.id).toBe('vibrant');
    expect(archived.archived).toBe(true);
  });

  it('getAllTemplates includes archived templates (registry keeps every manifest)', () => {
    expect(getAllTemplates().some((t) => t.archived)).toBe(true);
  });
});
