import {
  DEFAULT_LOCALE,
  HEADERS,
  HTTP_STATUS,
  PRODUCTION_DOMAINS,
  SUPPORTED_LOCALES,
} from '@lmgroktfy/shared';
import { defineMiddleware, sequence } from 'astro:middleware';
import { HSTS_HEADER, SECURITY_HEADERS } from './lib/security-headers';

const API_PATH_PREFIX = '/api/';
const WELL_KNOWN_PREFIX = '/.well-known/';
const LANG_QUERY_PARAM = 'lang';

// The Worker-served endpoint files (`llms.txt`, `robots.txt`, `sitemap.xml`, the
// markdown twins) must never be locale-redirected. A bare "has a dot" test would
// also skip a legitimate question containing a dot (`/node.js+vs+deno`), diverging
// from the client-side mirror that redirects it. Match only these known suffixes.
const ENDPOINT_FILE_EXTENSIONS = ['.md', '.xml', '.txt', '.json'] as const;

function isSupportedLocale(value: string): boolean {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Backward-compatible `?lang=xx` shim: rewrites the query-string language
 * selector to the canonical locale-prefixed path (`/es/…`, and the unprefixed
 * root for the default locale). Only page navigations are rewritten — API,
 * `.well-known`, and file/endpoint routes are left untouched so a token-bearing
 * POST or a markdown/xml twin is never redirected. A no-op target (the locale
 * already matches the path) falls through instead of self-redirecting.
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
  if (ENDPOINT_FILE_EXTENSIONS.some((ext) => lastSegment.endsWith(ext))) {
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
  const url = context.url;
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
 * Applies the shared static security headers to SSR responses. The prerendered
 * pages Cloudflare serves from the ASSETS layer bypass this Worker entirely, so
 * they receive the same headers from the build-generated `_headers` instead —
 * both paths draw from {@link SECURITY_HEADERS}. HSTS is sent only on the
 * production custom domains, never on staging (`dev.lmgroktfy.com`) or the
 * shared `workers.dev` host, so a browser is never pinned to https for a
 * non-production host.
 */
export const securityHeaders = defineMiddleware(async (context, next) => {
  const response = await next();

  const scope = securityScope(context.url.hostname);
  if (!scope.applyHeaders) {
    return response;
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  if (scope.applyHsts) {
    response.headers.set(HSTS_HEADER.name, HSTS_HEADER.value);
  }
  return response;
});

export const onRequest = sequence(langRedirect, cors, securityHeaders);

function securityScope(hostname: string): { applyHeaders: boolean; applyHsts: boolean } {
  const isLocalhost =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  return {
    applyHeaders: !isLocalhost,
    applyHsts: PRODUCTION_DOMAINS.includes(hostname as (typeof PRODUCTION_DOMAINS)[number]),
  };
}
