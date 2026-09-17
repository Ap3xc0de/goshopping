/**
 * @jest-environment node
 *
 * REQ-RENDER-01 (host -> /[storeSlug] rewrite) + REQ-INFRA-02 (legacy host
 * cut, implemented here per design §4.1 — the ALB wildcard already routes
 * the legacy fixed hostname to this same app, so the "stops working"
 * decision lives in this middleware, not in Terraform).
 *
 * Uses raw `fetch`, never the SDK (middleware runs on the Edge runtime —
 * see design §4.1 and spike #1097).
 */
import { NextRequest } from 'next/server';
import { middleware, normalizeHost } from '@/middleware';

function makeRequest(host: string, pathname = '/'): NextRequest {
  return new NextRequest(`https://${host}${pathname}`, {
    headers: { host },
  });
}

describe('normalizeHost', () => {
  it.each([
    ['uppercase_host', 'TIENDA1.GOSHOPPING.COM', 'tienda1.goshopping.com'],
    ['host_with_port', 'tienda1.goshopping.com:3000', 'tienda1.goshopping.com'],
    ['host_with_www_prefix', 'www.tienda1.goshopping.com', 'tienda1.goshopping.com'],
    ['host_with_trailing_dot', 'tienda1.goshopping.com.', 'tienda1.goshopping.com'],
    [
      'host_with_www_and_port_and_trailing_dot_combined',
      'WWW.Tienda1.GoShopping.com:8443.',
      'tienda1.goshopping.com',
    ],
  ])('%s: %s -> %s', (_name, input, expected) => {
    expect(normalizeHost(input)).toBe(expected);
  });
});

describe('middleware host rewrite', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, CORE_API_URL: 'https://api.test' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('rewrites slug.goshopping.com/ to /slug/', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slug: 'tienda1' }),
    }) as unknown as typeof fetch;

    const req = makeRequest('tienda1.goshopping.com', '/catalogo');
    const res = await middleware(req);

    expect(res.headers.get('x-middleware-rewrite')).toContain('/tienda1/catalogo');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test/public/by-domain/tienda1.goshopping.com/config',
      expect.anything(),
    );
  });

  it('rewrites www.slug.goshopping.com the same as slug.goshopping.com', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slug: 'tienda1' }),
    }) as unknown as typeof fetch;

    const req = makeRequest('www.tienda1.goshopping.com', '/');
    const res = await middleware(req);

    expect(res.headers.get('x-middleware-rewrite')).toContain('/tienda1');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test/public/by-domain/tienda1.goshopping.com/config',
      expect.anything(),
    );
  });

  it('passes through unknown host without crashing (delegates 404 downstream)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

    const req = makeRequest('no-existe.goshopping.com', '/');
    const res = await middleware(req);

    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes through when the config fetch itself fails (network error, fail-open)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const req = makeRequest('tienda1.goshopping.com', '/');
    const res = await middleware(req);

    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('hard-cuts the legacy host with 404 by default (redirect gate not enabled)', async () => {
    process.env.LEGACY_STOREFRONT_HOST = 'app.staging.goshopping.com';
    global.fetch = jest.fn();

    const req = makeRequest('app.staging.goshopping.com', '/tienda1');
    const res = await middleware(req);

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('redirects the legacy host with 301 when the gate env var is explicitly enabled', async () => {
    process.env.LEGACY_STOREFRONT_HOST = 'app.staging.goshopping.com';
    process.env.STOREFRONT_LEGACY_REDIRECT_ENABLED = 'true';
    process.env.STOREFRONT_LEGACY_REDIRECT_TARGET = 'https://staging.goshopping.com';
    global.fetch = jest.fn();

    const req = makeRequest('app.staging.goshopping.com', '/tienda1');
    const res = await middleware(req);

    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://staging.goshopping.com/');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
