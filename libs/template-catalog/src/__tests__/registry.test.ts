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

  it('none of the registered templates is archived by default', () => {
    getAllTemplates().forEach((t) => expect(t.archived).toBeFalsy());
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
});
