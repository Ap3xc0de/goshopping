import * as dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== 'test') {
    console.warn(`[Config] Warning: ${name} is not set`);
  }
  return value || '';
}

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || '*').split(','),
  },

  generation: {
    maxTokens: parseInt(process.env.GENERATION_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.GENERATION_TEMPERATURE || '0.5'),
  },
};
