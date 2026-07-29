import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { StoreStorage } from '../services/store-storage';
import { AssembledStore } from '../services/store-assembler';
import { StoreConfig } from '../services/store-config-builder';

const mockConfig: StoreConfig = {
  name: 'Test Store',
  category: 'general',
  style: 'minimal',
  colors: { primary: '142 71% 45%', secondary: '322 71% 45%', accent: '202 71% 45%' },
  tagline: 'Test tagline',
  logo_url: null,
  pages: ['inicio', 'catalogo'],
};

function makeMockAssembled(storeSlug: string): AssembledStore {
  return {
    storeSlug,
    storeId: 'test-store-id',
    templateId: 'minimal',
    files: [
      { path: 'app/page.tsx', content: "'use client';\nexport default function H() { return <div />; }", type: 'page' },
      { path: 'app/globals.css', content: ':root { --brand-primary: red; }', type: 'style' },
    ],
    cssVariables: { '--brand-primary': '142 71% 45%' },
    storeConfig: mockConfig,
    assembledAt: new Date().toISOString(),
  };
}

describe('StoreStorage', () => {
  let tmpDir: string;
  let storage: StoreStorage;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'goshopping-test-'));
    storage = new StoreStorage(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('saves store files and metadata to filesystem', async () => {
    const assembled = makeMockAssembled('test-store');
    const stored = await storage.save(assembled);

    expect(stored.storeSlug).toBe('test-store');
    expect(stored.status).toBe('preview');
    expect(stored.version).toBe(1);

    // Verify files were written
    const metaPath = path.join(tmpDir, 'test-store', 'store-meta.json');
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(meta.storeSlug).toBe('test-store');
  });

  it('loads metadata for an existing store', async () => {
    const assembled = makeMockAssembled('test-store');
    await storage.save(assembled);

    const loaded = await storage.load('test-store');
    expect(loaded).not.toBeNull();
    expect(loaded?.storeSlug).toBe('test-store');
    expect(loaded?.assembledStore.storeConfig.name).toBe('Test Store');
  });

  it('returns null for a non-existent store', async () => {
    const result = await storage.load('does-not-exist');
    expect(result).toBeNull();
  });

  it('increments version on re-save', async () => {
    const assembled = makeMockAssembled('test-store');
    await storage.save(assembled);
    const second = await storage.save(assembled);
    expect(second.version).toBe(2);
  });

  it('publishes a store and sets status + publishedAt', async () => {
    const assembled = makeMockAssembled('test-store');
    await storage.save(assembled);

    const published = await storage.publish('test-store');
    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeTruthy();
  });

  it('archives a store and sets status to archived', async () => {
    const assembled = makeMockAssembled('test-store');
    await storage.save(assembled);
    await storage.archive('test-store');

    const loaded = await storage.load('test-store');
    expect(loaded?.status).toBe('archived');
  });

  it('lists all stored stores', async () => {
    await storage.save(makeMockAssembled('store-a'));
    await storage.save(makeMockAssembled('store-b'));

    const list = await storage.list();
    const slugs = list.map((s) => s.storeSlug).sort();
    expect(slugs).toEqual(['store-a', 'store-b']);
  });

  it('returns empty array when base path is empty', async () => {
    const list = await storage.list();
    expect(list).toEqual([]);
  });

  it('throws when publishing a non-existent store', async () => {
    await expect(storage.publish('nope')).rejects.toThrow("Store 'nope' not found");
  });

  it('throws when archiving a non-existent store', async () => {
    await expect(storage.archive('nope')).rejects.toThrow("Store 'nope' not found");
  });
});
