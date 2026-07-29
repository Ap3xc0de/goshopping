import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { healthRouter } from './routes/health';
import { chatRouter } from './routes/chat';
import { generateRouter } from './routes/generate';

export function createApp(): express.Application {
  const app = express();
  const allowedOrigins = config.cors.origins.map((origin) => origin.trim()).filter(Boolean);
  const corsOrigin = allowedOrigins.includes('*') ? true : allowedOrigins;

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // CORS
  app.use(
    cors({
      origin: corsOrigin,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Rate limiting — stricter on generate endpoint
  const globalLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const generateLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    message: { error: 'Too many generation requests. Try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);

  // Routes
  app.use('/health', healthRouter);
  app.use('/chat', chatRouter);
  app.use('/generate', generateLimiter, generateRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

// Only start server when run directly (not during tests)
if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[AI Engine] Running on port ${config.port}`);
  });
}
