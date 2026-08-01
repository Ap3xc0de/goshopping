import * as dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== 'test') {
    console.warn(`[Config] Warning: ${name} is not set`);
  }
  return value || '';
}

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'test') {
    return 'test-secret-for-goshopping-tests!!'; // >= 32 chars for parity with Core
  }
  throw new Error('JWT_SECRET is required');
}

function resolveCorsOrigins(nodeEnv: string): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (nodeEnv === 'production') {
    if (!raw || raw.trim() === '' || raw.trim() === '*') {
      throw new Error('CORS_ORIGINS is required in production and must not be *');
    }
    return raw.split(',').map((o) => o.trim()).filter(Boolean);
  }
  if (!raw || raw.trim() === '') {
    return nodeEnv === 'test' ? ['*'] : ['*']; // ponytail: wildcard only outside production
  }
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv,

  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  },

  auth: {
    jwtSecret: resolveJwtSecret(),
  },

  cors: {
    origins: resolveCorsOrigins(nodeEnv),
  },

  generation: {
    maxTokens: parseInt(process.env.GENERATION_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.GENERATION_TEMPERATURE || '0.5'),
  },
};
