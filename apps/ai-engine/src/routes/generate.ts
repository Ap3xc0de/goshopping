import { Request, Response, Router } from 'express';
import { GenerationPipeline, StoreGenerationRequest } from '../services/generation-pipeline';
import { StoreAssembler } from '../services/store-assembler';
import { StoreStorage } from '../services/store-storage';
import { assertStoreAccess, requireAuth } from '../middleware/auth';

export const generateRouter = Router();

const pipeline = new GenerationPipeline();
const assembler = new StoreAssembler();
const storage = new StoreStorage();

// POST /generate/store — Generate a full store
generateRouter.post('/store', requireAuth, async (req: Request, res: Response) => {
  const body = req.body as {
    store_config?: StoreGenerationRequest['storeConfig'];
    store_slug?: string;
    store_id?: string;
  };

  if (!body.store_config || !body.store_slug || !body.store_id) {
    return res.status(400).json({
      error: 'store_config, store_slug, and store_id are required',
    });
  }

  if (!assertStoreAccess(req, res, body.store_id)) return;

  const { store_config } = body;
  if (!store_config.name || !store_config.category || !store_config.style) {
    return res.status(400).json({
      error: 'store_config must include name, category, style, and colors',
    });
  }

  try {
    const generationResult = await pipeline.generateStore({
      storeConfig: store_config,
      storeSlug: body.store_slug,
      storeId: body.store_id,
    });

    const assembled = assembler.assemble(
      generationResult,
      store_config as Parameters<typeof assembler.assemble>[1],
      body.store_slug,
      body.store_id,
      store_config.style,
    );

    const stored = await storage.save(assembled);

    const previewUrl = `${process.env.STOREFRONT_BASE_URL ?? 'http://localhost:3004'}/${body.store_slug}`;

    const httpStatus = generationResult.success ? 200 : 207;
    return res.status(httpStatus).json({
      success: generationResult.success,
      store_slug: body.store_slug,
      preview_url: previewUrl,
      version: stored.version,
      pages: generationResult.pages,
      css_variables: generationResult.cssVariables,
      errors: generationResult.errors,
      threat_count: generationResult.threats.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GenerateRoute] Error:', err);
    return res.status(500).json({ error: message });
  }
});

async function assertSlugStoreAccess(req: Request, res: Response, storeSlug: string): Promise<boolean> {
  const loaded = await storage.load(storeSlug);
  if (!loaded) {
    res.status(404).json({ error: `Store '${storeSlug}' not found` });
    return false;
  }
  return assertStoreAccess(req, res, loaded.storeId);
}

// POST /generate/store/:storeSlug/publish — Publish a generated store
generateRouter.post('/store/:storeSlug/publish', requireAuth, async (req: Request, res: Response) => {
  const { storeSlug } = req.params;
  if (!(await assertSlugStoreAccess(req, res, storeSlug))) return;

  try {
    const stored = await storage.publish(storeSlug);
    const baseUrl = process.env.STOREFRONT_PUBLIC_URL ?? 'https://goshopping.co';
    return res.json({
      success: true,
      store_slug: storeSlug,
      status: stored.status,
      url: `${baseUrl}/${storeSlug}`,
      published_at: stored.publishedAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});

// GET /generate/store/:storeSlug/status — Get store status
generateRouter.get('/store/:storeSlug/status', requireAuth, async (req: Request, res: Response) => {
  const { storeSlug } = req.params;
  if (!(await assertSlugStoreAccess(req, res, storeSlug))) return;

  const loaded = await storage.load(storeSlug);
  // assertSlugStoreAccess already 404'd if missing; load again is fine (tiny)
  if (!loaded) {
    return res.status(404).json({ error: `Store '${storeSlug}' not found` });
  }
  const previewUrl = `${process.env.STOREFRONT_BASE_URL ?? 'http://localhost:3004'}/${storeSlug}`;
  const publicUrl =
    loaded.status === 'published'
      ? `${process.env.STOREFRONT_PUBLIC_URL ?? 'https://goshopping.co'}/${storeSlug}`
      : undefined;

  return res.json({
    store_slug: storeSlug,
    status: loaded.status,
    version: loaded.version,
    preview_url: previewUrl,
    url: publicUrl,
    created_at: loaded.createdAt,
    published_at: loaded.publishedAt,
  });
});

// DELETE /generate/store/:storeSlug — Archive a store
generateRouter.delete('/store/:storeSlug', requireAuth, async (req: Request, res: Response) => {
  const { storeSlug } = req.params;
  if (!(await assertSlugStoreAccess(req, res, storeSlug))) return;

  try {
    await storage.archive(storeSlug);
    return res.json({ success: true, store_slug: storeSlug, status: 'archived' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});
