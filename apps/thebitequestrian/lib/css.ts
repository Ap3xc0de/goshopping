// Builds a CSS url() value that is safe for any image URL. Unquoted url()
// breaks on spaces, parentheses and quotes (e.g. "WhatsApp Image 1.jpeg"),
// so the URL is always emitted as a quoted string with " and \ escaped.
export function cssUrl(url: string): string {
  return `url("${url.replace(/["\\]/g, '\\$&').replace(/\n/g, '')}")`;
}
