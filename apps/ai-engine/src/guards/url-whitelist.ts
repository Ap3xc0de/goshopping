/**
 * URL whitelist — only these domains are allowed in generated code fetch() calls.
 */

export const ALLOWED_DOMAINS: readonly string[] = [
  // Public CDN and font services
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  // Image services
  'images.unsplash.com',
  'source.unsplash.com',
  'picsum.photos',
  'placehold.co',
  'via.placeholder.com',
  // Icon and asset services
  'raw.githubusercontent.com',
  'avatars.githubusercontent.com',
  // Common public APIs approved for storefronts
  'api.stripe.com',
  'js.stripe.com',
  // Analytics (read-only)
  'www.googletagmanager.com',
];

const ALLOWED_DOMAIN_REGEX = new RegExp(
  `^https?://(${ALLOWED_DOMAINS.map((d) => d.replace('.', '\\.')).join('|')})(/|$)`,
  'i',
);

/**
 * Returns true if the URL is in the approved whitelist.
 */
export function isUrlAllowed(url: string): boolean {
  // Allow relative URLs (they stay within the same origin)
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }
  return ALLOWED_DOMAIN_REGEX.test(url);
}

/**
 * Extracts all URLs from a string (fetch calls, src attributes, href attributes).
 */
export function extractUrls(code: string): string[] {
  const urls: string[] = [];

  // fetch('...') or fetch("...")
  const fetchRegex = /fetch\s*\(\s*['"`]([^'"`\s]+)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = fetchRegex.exec(code)) !== null) {
    urls.push(m[1]);
  }

  // src="..." or src='...'
  const srcRegex = /\bsrc\s*=\s*['"`]([^'"`\s]+)['"`]/g;
  while ((m = srcRegex.exec(code)) !== null) {
    urls.push(m[1]);
  }

  // href="..." (only http/https)
  const hrefRegex = /\bhref\s*=\s*['"`](https?:\/\/[^'"`\s]+)['"`]/g;
  while ((m = hrefRegex.exec(code)) !== null) {
    urls.push(m[1]);
  }

  return [...new Set(urls)];
}
