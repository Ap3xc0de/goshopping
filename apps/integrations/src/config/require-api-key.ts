/** Fail closed outside development/test: INTEGRATIONS_API_KEY must be set at boot. */
export function assertIntegrationsApiKeyConfigured(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const appEnv = env.APP_ENV || env.NODE_ENV || 'development';
  if (appEnv !== 'development' && appEnv !== 'test' && !env.INTEGRATIONS_API_KEY) {
    throw new Error(
      'INTEGRATIONS_API_KEY is required when APP_ENV/NODE_ENV is not development or test',
    );
  }
}

export function isRelaxedAuthEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const appEnv = env.APP_ENV || env.NODE_ENV || 'development';
  return appEnv === 'development' || appEnv === 'test';
}
