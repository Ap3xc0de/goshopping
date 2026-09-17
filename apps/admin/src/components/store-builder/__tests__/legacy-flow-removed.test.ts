import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, sep } from 'path';

const STORE_BUILDER_DIR = join(__dirname, '..');
const ADMIN_SRC_DIR = join(__dirname, '..', '..', '..');
const THIS_FILE = __filename;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === 'node_modules') return [];
    const stat = statSync(full);
    return stat.isDirectory() ? walk(full) : [full];
  });
}

/**
 * REQ-ADMIN-05 — static verification (no rendering involved): the old AI
 * chat store-creation flow must be fully gone from apps/admin/src, and
 * apps/admin must no longer talk to the ai-engine service at all. Slice 9
 * (deleting apps/ai-engine itself) is explicitly OUT of scope here — this
 * only decouples admin from it.
 */
describe('conversational flow removed (REQ-ADMIN-05)', () => {
  const REMOVED_COMPONENT_FILES = [
    'ChatAssistant.tsx',
    'GenerationProgress.tsx',
    'ChatMessage.tsx',
    'StyleSelector.tsx',
    'StoreConfigSummary.tsx',
  ];

  it.each(REMOVED_COMPONENT_FILES)('%s no longer exists in store-builder/', (filename) => {
    expect(existsSync(join(STORE_BUILDER_DIR, filename))).toBe(false);
  });

  it('ChatAssistant.test.tsx no longer exists under src/__tests__', () => {
    expect(existsSync(join(ADMIN_SRC_DIR, '__tests__', 'ChatAssistant.test.tsx'))).toBe(false);
  });

  it('no file under apps/admin/src references NEXT_PUBLIC_AI_ENGINE_URL', () => {
    const offenders = walk(ADMIN_SRC_DIR)
      .filter((file) => file !== THIS_FILE)
      .filter((file) => readFileSync(file, 'utf-8').includes('NEXT_PUBLIC_AI_ENGINE_URL'));

    expect(offenders.map((f) => f.split(sep).join('/'))).toEqual([]);
  });
});
