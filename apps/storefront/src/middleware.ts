import { NextRequest, NextResponse } from 'next/server';

/**
 * Resolves a request's Host into `/[storeSlug]/...` (REQ-RENDER-01).
 *
 * Runs on the Edge runtime (Next.js middleware always does — no explicit
 * `runtime` export needed). Uses raw `fetch`, never `GoShoppingClient`: the
 * spike (#1097) confirmed the SDK's `client.ts` is isomorphic, but bundling
 * the whole SDK package into an Edge isolate for a single GET is dead
 * weight the middleware doesn't need (design §4.1).
 */

/**
 * REQ-INFRA-02, implemented here (not in Terraform — see design §4.1): the
 * ALB wildcard already forwards the legacy fixed hostname
 * (`app.<env>.<base>`) to this same app, so "stops working" is a decision
 * made in this middleware, not in infrastructure.
 *
 * The gate from design §7 step 0 (`SELECT count(*) FROM stores WHERE
 * status='active'` with real production traffic evidence) has NOT been run
 * yet. Hard-cut (404) is therefore the default. If that gate later shows
 * real usage, flip it to a 301 redirect by setting BOTH env vars below —
 * never by editing this file. Read fresh on every request (not cached at
 * module load) so this stays a pure one-line config change.
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const host = normalizeHost(req.headers.get('host') ?? '');
  const legacyHost = process.env.LEGACY_STOREFRONT_HOST;

  if (legacyHost && host === normalizeHost(legacyHost)) {
    const redirectEnabled = process.env.STOREFRONT_LEGACY_REDIRECT_ENABLED === 'true';
    const redirectTarget = process.env.STOREFRONT_LEGACY_REDIRECT_TARGET;
    if (redirectEnabled && redirectTarget) {
      return NextResponse.redirect(redirectTarget, 301);
    }
    return new NextResponse(null, { status: 404 });
  }

  const apiURL = process.env.CORE_API_URL;
  if (!host || !apiURL) return NextResponse.next();

  let res: Response;
  try {
    res = await fetch(`${apiURL}/public/by-domain/${host}/config`, {
      next: { revalidate: 30 },
    });
  } catch {
    // Fail open: a downstream/network error here must never crash the
    // request — let it fall through to whatever the unrewritten path
    // resolves to.
    return NextResponse.next();
  }

  if (!res.ok) return NextResponse.next(); // unknown host — 404 happens downstream

  const body = (await res.json().catch(() => null)) as { slug?: string } | null;
  if (!body?.slug) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/${body.slug}${req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

/**
 * Canonicalizes a request host: lowercase, no port, no trailing dot, no
 * "www." prefix. Mirrors apps/core/internal/handlers/public.go#normalizeHost
 * exactly (REQ-RESOLVE-02) — both sides must agree on the same hostname
 * form for `store_domains.hostname` lookups to match.
 */
export function normalizeHost(raw: string): string {
  let h = raw.toLowerCase();
  const colonIndex = h.indexOf(':');
  if (colonIndex !== -1) h = h.slice(0, colonIndex);
  if (h.endsWith('.')) h = h.slice(0, -1);
  if (h.startsWith('www.')) h = h.slice(4);
  return h;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
