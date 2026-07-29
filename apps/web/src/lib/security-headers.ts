/**
 * Single source of truth for the security headers applied to every response,
 * shared by the SSR middleware (Worker-served pages and API routes) and the
 * build-generated `_headers` file (assets Cloudflare serves without invoking
 * the Worker). One definition keeps the two delivery paths from drifting.
 *
 * The policy carries no per-request nonce: the client island ships as an
 * external bundled script under `script-src 'self'`, so the CSP is identical
 * for every response and can be emitted statically for pages that bypass the
 * Worker.
 */
// `static.cloudflareinsights.com` (the beacon script) and `cloudflareinsights.com`
// (its metrics POST target) admit the Cloudflare Web Analytics RUM beacon the zone
// auto-injects into HTML responses. The beacon is an external script, so allowing
// the two hosts is enough and the policy needs no `unsafe-inline`.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  'frame-src https://challenges.cloudflare.com',
  "style-src 'self' https://cdnjs.cloudflare.com",
  'font-src https://cdnjs.cloudflare.com',
  "connect-src 'self' https://cloudflareinsights.com",
  "img-src 'self' data:",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * HSTS pins a browser to https for the host, so it is delivered only on the
 * production custom domains — never on staging or the shared `workers.dev`
 * host. Kept separate from {@link SECURITY_HEADERS} because both the middleware
 * and the `_headers` generator apply it conditionally.
 */
export const HSTS_HEADER = {
  name: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains',
} as const;
