import { Injectable } from '@nestjs/common';

/**
 * ConfigService reads configuration from environment variables.
 * In staging/production, values come from AWS SSM/Secrets Manager
 * (injected as env vars by ECS task definitions).
 */
@Injectable()
export class ConfigService {
  get coreApiUrl(): string {
    return process.env.CORE_API_URL || 'http://localhost:3000';
  }

  get awsRegion(): string {
    return process.env.AWS_REGION || 'us-east-1';
  }

  get appEnv(): string {
    return process.env.APP_ENV || 'development';
  }

  get isDevelopment(): boolean {
    return this.appEnv === 'development';
  }

  get port(): number {
    return parseInt(process.env.PORT || '3001', 10);
  }

  get integrationsApiKey(): string {
    return process.env.INTEGRATIONS_API_KEY || '';
  }

  /** Comma-separated CORE origins; defaults to localhost in development. */
  get corsOrigins(): string[] {
    const raw =
      process.env.CORS_ORIGINS ||
      (this.isDevelopment ? 'http://localhost:3000,http://localhost:5173' : '');
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
