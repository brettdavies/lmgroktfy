import {
  DEFAULT_LOCALE,
  HEADERS,
  HTTP_STATUS,
  PRODUCTION_DOMAINS,
  SUPPORTED_LOCALES,
} from '@lmgroktfy/shared';
import { defineMiddleware, sequence } from 'astro:middleware';

const API_PATH_PREFIX = '/api/';
const WELL_KNOWN_PREFIX = '/.well-known/';
const LANG_QUERY_PARAM = 'lang';
const TURNSTILE_HOST = 'https://challenges.cloudflare.com';
const FONT_AWESOME_HOST = 'https://cdnjs.cloudflare.com';

function isSupportedLocale(value: string): boolean {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Legacy `?lang=xx` shim: rewrites the old query-string language selector to the
 * canonical locale-prefixed path (`/es/…`, and the unprefixed root for the
 * default locale). Only page navigations are rewritten — API, `.well-known`,
 * and file/endpoint routes are left untouched so a token-bearing POST or a
 * markdown/xml twin is never redirected. A no-op target (the locale already
 * matches the path) falls through instead of self-redirecting.
 */
export const langRedirect = defineMiddleware(async (context, next) => {
  if (context.request.method !== 'GET') {
    return next();
  }

  const { url } = context;
  const requested = url.searchParams.get(LANG_QUERY_PARAM);
  if (requested === null || !isSupportedLocale(requested)) {
    return next();
  }

  if (url.pathname.startsWith(API_PATH_PREFIX) || url.pathname.startsWith(WELL_KNOWN_PREFIX)) {
    return next();
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? '';
  if (lastSegment.includes('.')) {
    return next();
  }

  if (segments.length > 0 && isSupportedLocale(segments[0])) {
    segments.shift();
  }
  const rest = segments.join('/');
  const prefix = requested === DEFAULT_LOCALE ? '' : `/${requested}`;
  const path = rest ? `${prefix}/${rest}` : `${prefix}/`;

  const remaining = new URLSearchParams(url.search);
  remaining.delete(LANG_QUERY_PARAM);
  const query = remaining.toString();
  const current = query ? `${url.pathname}?${query}` : url.pathname;
  const target = query ? `${path}?${query}` : path;
  if (target === current) {
    return next();
  }

  return context.redirect(target);
});

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
 * The `/api/*` surface is first-party only: the client calls it same-origin (a
 * relative fetch on whatever host serves the page), so any cross-origin browser
 * caller is rejected server-side. A non-browser caller can forge or omit
 * `Origin`, so Turnstile and the rate limit — not this check — are the real
 * controls; this is defense-in-depth against browser-based cross-site use.
 */
export const cors = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith(API_PATH_PREFIX)) {
    return next();
  }

  const origin = context.request.headers.get('Origin');
  if (origin && origin !== url.origin) {
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
 * Emits security headers, including a concrete CSP whose script-src carries a
 * fresh per-request nonce (exposed on `locals.cspNonce`) so a script tag is
 * allowed without `'unsafe-inline'`. HSTS is sent only on the production custom
 * domains, never on staging (`dev.lmgroktfy.com`) or the shared `workers.dev`
 * host, so a browser is never pinned to https for a non-production host.
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

export const onRequest = sequence(langRedirect, cors, securityHeaders);

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
  return {
    applyHeaders: !isLocalhost,
    applyHsts: PRODUCTION_DOMAINS.includes(hostname as (typeof PRODUCTION_DOMAINS)[number]),
  };
}
