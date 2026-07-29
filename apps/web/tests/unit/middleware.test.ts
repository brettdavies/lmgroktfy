import { describe, expect, mock, test } from 'bun:test';

mock.module('astro:middleware', () => ({
  defineMiddleware: (fn: unknown) => fn,
  sequence:
    (...handlers: Array<(context: unknown, next: () => Promise<Response>) => Promise<Response>>) =>
    async (context: unknown) => {
      const run = async (index: number): Promise<Response> => {
        if (index >= handlers.length) {
          return new Response('OK');
        }
        return handlers[index](context, () => run(index + 1));
      };
      return run(0);
    },
}));

const { cors, securityHeaders, onRequest, langRedirect } = await import('../../src/middleware.ts');

type FakeContext = {
  request: Request;
  url: URL;
  locals: { cspNonce?: string };
};

function makeContext(urlStr: string, opts: { method?: string; origin?: string } = {}): FakeContext {
  const headers = new Headers();
  if (opts.origin) {
    headers.set('Origin', opts.origin);
  }
  return {
    request: new Request(urlStr, { method: opts.method ?? 'GET', headers }),
    url: new URL(urlStr),
    locals: {},
  };
}

// biome-ignore lint/suspicious/noExplicitAny: the fake context matches only the fields the middleware reads.
const asMiddleware = (fn: unknown) => fn as (context: any, next: () => Promise<Response>) => Promise<Response>;

describe('cors middleware', () => {
  const nextOk = async () => new Response('ok', { status: 200 });

  test('rejects a disallowed Origin on an API route with 403', async () => {
    const context = makeContext('https://lmgroktfy.com/api/grok', {
      method: 'POST',
      origin: 'https://evil.com',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  test('reflects an allowed Origin on a successful API response', async () => {
    const context = makeContext('https://lmgroktfy.com/api/grok', {
      method: 'POST',
      origin: 'https://lmgroktfy.com',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://lmgroktfy.com');
  });

  test('rejects a plaintext http Origin on an allowed domain with 403', async () => {
    const context = makeContext('https://lmgroktfy.com/api/grok', {
      method: 'POST',
      origin: 'http://lmgroktfy.com',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  test('rejects a prefix-suffix lookalike Origin with 403', async () => {
    const context = makeContext('https://lmgroktfy.com/api/grok', {
      method: 'POST',
      origin: 'https://evil-lmgroktfy.com',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  test('rejects a trailing-domain lookalike Origin with 403', async () => {
    const context = makeContext('https://lmgroktfy.com/api/grok', {
      method: 'POST',
      origin: 'https://lmgroktfy.com.evil.com',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  test('rejects a cross-origin sibling subdomain with 403', async () => {
    const context = makeContext('https://lmgroktfy.com/api/grok', {
      method: 'POST',
      origin: 'https://www.lmgroktfy.com',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  test('allows a same-origin request on a host outside ALLOWED_DOMAINS (staging)', async () => {
    const context = makeContext('https://lmgroktfy-staging.workers.dev/api/grok', {
      method: 'POST',
      origin: 'https://lmgroktfy-staging.workers.dev',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://lmgroktfy-staging.workers.dev'
    );
  });

  test('still rejects a cross-origin caller on the staging host with 403', async () => {
    const context = makeContext('https://lmgroktfy-staging.workers.dev/api/grok', {
      method: 'POST',
      origin: 'https://evil.com',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  test('answers a preflight for an allowed Origin with 204', async () => {
    const context = makeContext('https://lmgroktfy.com/api/grok', {
      method: 'OPTIONS',
      origin: 'https://lmgroktfy.com',
    });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  test('does not touch non-API routes', async () => {
    const context = makeContext('https://lmgroktfy.com/', { origin: 'https://evil.com' });
    const response = await asMiddleware(cors)(context, nextOk);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('securityHeaders middleware', () => {
  const nextHtml = async () => new Response('<html></html>', { status: 200 });

  test('sets CSP with a per-request nonce but no HSTS on the workers.dev host', async () => {
    const context = makeContext('https://lmgroktfy-staging.workers.dev/');
    const response = await asMiddleware(securityHeaders)(context, nextHtml);
    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain('https://challenges.cloudflare.com');
    expect(csp).toContain('https://cdnjs.cloudflare.com');
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain(`'nonce-${context.locals.cspNonce}'`);
    expect(response.headers.get('Strict-Transport-Security')).toBeNull();
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  test('sets HSTS on the production custom domain', async () => {
    const context = makeContext('https://lmgroktfy.com/');
    const response = await asMiddleware(securityHeaders)(context, nextHtml);
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
  });

  test('applies security headers but no HSTS on the dev.lmgroktfy.com staging domain', async () => {
    const context = makeContext('https://dev.lmgroktfy.com/');
    const response = await asMiddleware(securityHeaders)(context, nextHtml);
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('Strict-Transport-Security')).toBeNull();
  });

  test('mints a fresh nonce per request', async () => {
    const first = makeContext('https://lmgroktfy.com/');
    const second = makeContext('https://lmgroktfy.com/');
    await asMiddleware(securityHeaders)(first, nextHtml);
    await asMiddleware(securityHeaders)(second, nextHtml);
    expect(first.locals.cspNonce).toBeTruthy();
    expect(second.locals.cspNonce).toBeTruthy();
    expect(first.locals.cspNonce).not.toBe(second.locals.cspNonce);
  });

  test('skips strict headers on localhost during development', async () => {
    const context = makeContext('http://localhost:4321/');
    const response = await asMiddleware(securityHeaders)(context, nextHtml);
    expect(response.headers.get('Content-Security-Policy')).toBeNull();
    expect(response.headers.get('Strict-Transport-Security')).toBeNull();
  });
});

describe('onRequest sequence', () => {
  test('composes CORS and security headers on a production API response', async () => {
    const context = makeContext('https://lmgroktfy.com/api/grok', {
      method: 'POST',
      origin: 'https://lmgroktfy.com',
    });
    const response = await asMiddleware(onRequest)(context, async () => new Response('OK'));
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://lmgroktfy.com');
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
  });
});

function makeLangContext(urlStr: string, method = 'GET') {
  return {
    request: new Request(urlStr, { method }),
    url: new URL(urlStr),
    locals: {},
    redirect: (location: string, status = 302) =>
      new Response(null, { status, headers: { Location: location } }),
  };
}

describe('langRedirect middleware', () => {
  const passthrough = async () => new Response('passthrough', { status: 200 });

  test('redirects ?lang=es on the root to /es/', async () => {
    const context = makeLangContext('https://lmgroktfy.com/?lang=es');
    const response = await asMiddleware(langRedirect)(context, passthrough);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/es/');
  });

  test('redirects ?lang=en on a locale path back to the unprefixed root', async () => {
    const context = makeLangContext('https://lmgroktfy.com/es/?lang=en');
    const response = await asMiddleware(langRedirect)(context, passthrough);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
  });

  test('preserves a deep-link question path when switching locale', async () => {
    const context = makeLangContext('https://lmgroktfy.com/what+is+grok?lang=es');
    const response = await asMiddleware(langRedirect)(context, passthrough);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/es/what+is+grok');
  });

  test('ignores an unsupported lang value', async () => {
    const context = makeLangContext('https://lmgroktfy.com/?lang=zz');
    const response = await asMiddleware(langRedirect)(context, passthrough);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('passthrough');
  });

  test('does not redirect when there is no lang query', async () => {
    const context = makeLangContext('https://lmgroktfy.com/es/');
    const response = await asMiddleware(langRedirect)(context, passthrough);
    expect(response.status).toBe(200);
  });

  test('falls through when the requested locale already matches the path', async () => {
    const context = makeLangContext('https://lmgroktfy.com/es/?lang=es');
    const response = await asMiddleware(langRedirect)(context, passthrough);
    expect(response.status).toBe(200);
  });

  test('leaves a POST to the API untouched', async () => {
    const context = makeLangContext('https://lmgroktfy.com/api/grok?lang=es', 'POST');
    const response = await asMiddleware(langRedirect)(context, passthrough);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('passthrough');
  });
});
