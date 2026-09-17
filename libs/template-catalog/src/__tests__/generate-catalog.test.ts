import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildCatalog, serializeCatalog, writeCatalogTo } from '../generate-catalog';
import { getAllTemplates } from '../registry';

describe('generate-catalog', () => {
  it('produces one entry per registered manifest', () => {
    const catalog = buildCatalog();
    expect(catalog.templates).toHaveLength(getAllTemplates().length);
  });

  it('each entry includes id, name, description, category, preview_image, archived', () => {
    const [entry] = buildCatalog().templates;
    expect(entry).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        category: expect.any(Array),
        archived: expect.any(Boolean),
      }),
    );
    expect('preview_image' in entry).toBe(true);
  });

  it('is deterministic — building twice yields byte-identical output', () => {
    expect(serializeCatalog(buildCatalog())).toEqual(serializeCatalog(buildCatalog()));
  });

  it('writes byte-identical content to every destination path given', () => {
    const dir = mkdtempSync(join(tmpdir(), 'template-catalog-'));
    const destA = join(dir, 'a.json');
    const destB = join(dir, 'b.json');
    const json = serializeCatalog(buildCatalog());

    writeCatalogTo(json, [destA, destB]);

    expect(readFileSync(destA, 'utf-8')).toBe(json);
    expect(readFileSync(destB, 'utf-8')).toBe(json);
    rmSync(dir, { recursive: true, force: true });
  });
});
