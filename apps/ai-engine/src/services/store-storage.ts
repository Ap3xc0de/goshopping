import * as fs from 'fs/promises';
import * as path from 'path';
import { AssembledStore } from './store-assembler';

export type StoreStatus = 'preview' | 'published' | 'archived';

export interface StoredStore {
  storeSlug: string;
  storeId: string;
  version: number;
  status: StoreStatus;
  assembledStore: AssembledStore;
  createdAt: string;
  publishedAt?: string;
}

const DEFAULT_BASE_PATH = process.env.STORES_PATH || '/tmp/goshopping-stores';

export class StoreStorage {
  constructor(private readonly basePath: string = DEFAULT_BASE_PATH) {}

  async save(assembled: AssembledStore): Promise<StoredStore> {
    const storePath = path.join(this.basePath, assembled.storeSlug);
    await fs.mkdir(storePath, { recursive: true });

    // Write each source file
    for (const file of assembled.files) {
      const filePath = path.join(storePath, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
    }

    const stored: StoredStore = {
      storeSlug: assembled.storeSlug,
      storeId: assembled.storeId,
      version: 1,
      status: 'preview',
      assembledStore: assembled,
      createdAt: assembled.assembledAt,
    };

    // Check if previous version exists to increment
    const existing = await this.load(assembled.storeSlug);
    if (existing) {
      stored.version = existing.version + 1;
    }

    await fs.writeFile(
      path.join(storePath, 'store-meta.json'),
      JSON.stringify(stored, null, 2),
      'utf-8',
    );

    return stored;
  }

  async load(storeSlug: string): Promise<StoredStore | null> {
    const metaPath = path.join(this.basePath, storeSlug, 'store-meta.json');
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      return JSON.parse(raw) as StoredStore;
    } catch {
      return null;
    }
  }

  async list(): Promise<StoredStore[]> {
    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      const stores: StoredStore[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const stored = await this.load(entry.name);
          if (stored) stores.push(stored);
        }
      }
      return stores;
    } catch {
      return [];
    }
  }

  async publish(storeSlug: string): Promise<StoredStore> {
    const stored = await this.load(storeSlug);
    if (!stored) {
      throw new Error(`Store '${storeSlug}' not found`);
    }
    const updated: StoredStore = {
      ...stored,
      status: 'published',
      publishedAt: new Date().toISOString(),
    };
    const metaPath = path.join(this.basePath, storeSlug, 'store-meta.json');
    await fs.writeFile(metaPath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }

  async archive(storeSlug: string): Promise<void> {
    const stored = await this.load(storeSlug);
    if (!stored) {
      throw new Error(`Store '${storeSlug}' not found`);
    }
    const updated: StoredStore = { ...stored, status: 'archived' };
    const metaPath = path.join(this.basePath, storeSlug, 'store-meta.json');
    await fs.writeFile(metaPath, JSON.stringify(updated, null, 2), 'utf-8');
  }
}
