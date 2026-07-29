import { ALLOWED_DOMAINS, HEADERS, HTTP_STATUS } from '@lmgroktfy/shared';
import { defineMiddleware, sequence } from 'astro:middleware';

const API_PATH_PREFIX = '/api/';
const TURNSTILE_HOST = 'https://challenges.cloudflare.com';
const FONT_AWESOME_HOST = 'https://cdnjs.cloudflare.com';

function matchesAllowedDomain(hostname: string): boolean {
  return ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function isAllowedOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalhost)) {
    return false;
  }
  return matchesAllowedDomain(url.hostname);
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/**
 * Restricts cross-origin access to `/api/*` to `ALLOWED_DOMAINS`: a disallowed
 * `Origin` is rejected server-side (not merely un-reflected), preflights answer
 * only allowed origins, and successful responses reflect the validated origin.
 */
export const cors = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith(API_PATH_PREFIX)) {
    return next();
  }

  const origin = context.request.headers.get('Origin');
  // A same-origin request (the site calling its own API, including on the
  // staging workers.dev host that is not in ALLOWED_DOMAINS) is always allowed;
  // ALLOWED_DOMAINS gates only cross-origin callers.
  if (origin && origin !== url.origin && !isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: HTTP_STATUS.FORBIDDEN,
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
    });
  }

  if (context.request.method === 'OPTIONS') {
    const headers = origin
      ? corsHeaders(origin)
      : { 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
    return new Response(null, { status: HTTP_STATUS.NO_CONTENT, headers });
  }

  const response = await next();
  if (origin) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      response.headers.set(key, value);
    }
  }
  return response;
});

/**
 * Emits prod-scoped security headers, including a concrete CSP whose script-src
 * carries a fresh per-request nonce (exposed on `locals.cspNonce` for the island
 * mount, so no `'unsafe-inline'`). HSTS is scoped to the custom domain and is
 * never sent on the shared `workers.dev` host.
 */
export const securityHeaders = defineMiddleware(async (context, next) => {
  const nonce = createNonce();
  context.locals.cspNonce = nonce;

  const response = await next();

  const scope = securityScope(context.url.hostname);
  if (!scope.applyHeaders) {
    return response;
  }

  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (scope.applyHsts) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
});

export const onRequest = sequence(cors, securityHeaders);

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${TURNSTILE_HOST} 'nonce-${nonce}'`,
    `frame-src ${TURNSTILE_HOST}`,
    `style-src 'self' ${FONT_AWESOME_HOST}`,
    `font-src ${FONT_AWESOME_HOST}`,
    "connect-src 'self'",
    "img-src 'self' data:",
    "base-uri 'none'",
    "object-src 'none'",
  ].join('; ');
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function securityScope(hostname: string): { applyHeaders: boolean; applyHsts: boolean } {
  const isLocalhost =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  const isWorkersDev = hostname === 'workers.dev' || hostname.endsWith('.workers.dev');
  const isCustomDomain = matchesAllowedDomain(hostname);
  return {
    applyHeaders: !isLocalhost,
    applyHsts: isCustomDomain && !isWorkersDev,
  };
}
