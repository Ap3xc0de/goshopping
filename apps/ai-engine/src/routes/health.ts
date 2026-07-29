import { Request, Response, Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ai-engine',
    timestamp: new Date().toISOString(),
  });
});
