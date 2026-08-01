/**
 * Runnable check: npx ts-node src/config/require-api-key.selfcheck.ts
 * ponytail: no jest — one assert-based self-check instead of a test framework.
 */
import {
  assertIntegrationsApiKeyConfigured,
  isRelaxedAuthEnv,
} from './require-api-key';

function expectThrow(env: NodeJS.ProcessEnv, label: string): void {
  try {
    assertIntegrationsApiKeyConfigured(env);
    throw new Error(`expected throw for ${label}`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('expected throw')) throw err;
  }
}

function expectOk(env: NodeJS.ProcessEnv, label: string): void {
  try {
    assertIntegrationsApiKeyConfigured(env);
  } catch (err) {
    throw new Error(`expected ok for ${label}: ${err}`);
  }
}

expectOk({ APP_ENV: 'development' }, 'APP_ENV=development');
expectOk({ NODE_ENV: 'development' }, 'NODE_ENV=development');
expectOk({ NODE_ENV: 'test' }, 'NODE_ENV=test');
expectOk({ APP_ENV: 'test' }, 'APP_ENV=test');
expectOk(
  { NODE_ENV: 'production', INTEGRATIONS_API_KEY: 'secret' },
  'production with key',
);
expectOk(
  { APP_ENV: 'staging', INTEGRATIONS_API_KEY: 'secret' },
  'staging with key',
);

expectThrow({ NODE_ENV: 'production' }, 'NODE_ENV=production without key');
expectThrow({ APP_ENV: 'staging' }, 'APP_ENV=staging without key');
expectThrow({ APP_ENV: 'production' }, 'APP_ENV=production without key');

if (!isRelaxedAuthEnv({ NODE_ENV: 'development' })) {
  throw new Error('development should be relaxed');
}
if (isRelaxedAuthEnv({ NODE_ENV: 'production' })) {
  throw new Error('production should not be relaxed');
}

console.log('require-api-key.selfcheck: ok');
