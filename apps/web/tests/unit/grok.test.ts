import { afterEach, describe, expect, mock, test } from 'bun:test';
import { REQUEST_LIMITS } from '@lmgroktfy/shared';

interface FakeLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

const workersEnv: { RATE_LIMITER?: FakeLimiter } = {};

let apiKeyValue: string | undefined = 'test-api-key';

mock.module('astro:env/server', () => ({
  getSecret: (key: string) => (key === 'API_KEY' ? apiKeyValue : undefined),
}));
mock.module('cloudflare:workers', () => ({ env: workersEnv }));

const { POST } = await import('../../src/pages/api/grok.ts');

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  workersEnv.RATE_LIMITER = undefined;
  apiKeyValue = 'test-api-key';
});

function completionFetch(content: string, id = 'share-1'): typeof fetch {
  return (async () =>
    new Response(JSON.stringify({ id, choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;
}

async function invoke(request: Request): Promise<Response> {
  // The endpoint only reads `context.request`.
  return POST({ request } as Parameters<typeof POST>[0]);
}

function apiRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://lmgroktfy.com/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

function chunkedRequest(body: string): Request {
  const bytes = new TextEncoder().encode(body);
  const stream = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.byteLength; i += 1024) {
        controller.enqueue(bytes.subarray(i, i + 1024));
      }
      controller.close();
    },
  });
  return new Request('https://lmgroktfy.com/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: stream,
  });
}

describe('POST /api/grok', () => {
  test('returns {answer, shareId} for a valid question (success path)', async () => {
    globalThis.fetch = completionFetch('The answer is 42.', 'share-xyz');
    const response = await invoke(apiRequest(JSON.stringify({ question: 'What is the answer?' })));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { answer: string; shareId: string };
    expect(body.answer).toBe('The answer is 42.');
    expect(body.shareId).toBe('share-xyz');
  });

  test('rejects an oversized body with 413 before any upstream call', async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as unknown as typeof fetch;
    const huge = 'a'.repeat(REQUEST_LIMITS.MAX_BODY_BYTES + 1000);
    const response = await invoke(apiRequest(JSON.stringify({ question: huge })));
    expect(response.status).toBe(413);
    expect(called).toBe(false);
  });

  test('rejects an oversized body declared only via Content-Length', async () => {
    const response = await invoke(
      apiRequest(JSON.stringify({ question: 'hi' }), {
        'Content-Length': String(REQUEST_LIMITS.MAX_BODY_BYTES + 1),
      })
    );
    expect(response.status).toBe(413);
  });

  test('rejects an over-long question with 400', async () => {
    const overLong = 'a'.repeat(REQUEST_LIMITS.MAX_QUESTION_LENGTH + 1);
    const response = await invoke(apiRequest(JSON.stringify({ question: overLong })));
    expect(response.status).toBe(400);
  });

  test('rejects malformed JSON with 400', async () => {
    const response = await invoke(apiRequest('{not json'));
    expect(response.status).toBe(400);
  });

  test('maps a slow upstream to a generic 504 with no leak', async () => {
    globalThis.fetch = (async () => {
      throw new DOMException('Aborted', 'AbortError');
    }) as unknown as typeof fetch;
    const response = await invoke(apiRequest(JSON.stringify({ question: 'slow?' })));
    expect(response.status).toBe(504);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('Upstream request timed out');
  });

  test('maps an upstream 500 to a generic error without leaking upstream text', async () => {
    globalThis.fetch = (async () =>
      new Response('SENSITIVE_UPSTREAM_STACKTRACE xai-internal', { status: 500 })) as unknown as typeof fetch;
    const response = await invoke(apiRequest(JSON.stringify({ question: 'boom?' })));
    expect(response.status).toBe(502);
    const raw = await response.text();
    expect(raw).not.toContain('SENSITIVE_UPSTREAM_STACKTRACE');
    expect(raw).not.toContain('xai-internal');
  });

  test('returns 429 with Retry-After when the limiter rejects', async () => {
    workersEnv.RATE_LIMITER = { limit: async () => ({ success: false }) };
    const response = await invoke(
      apiRequest(JSON.stringify({ question: 'hi' }), { 'CF-Connecting-IP': '203.0.113.7' })
    );
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  test('keys the limiter on CF-Connecting-IP only', async () => {
    let seenKey = '';
    workersEnv.RATE_LIMITER = {
      limit: async ({ key }) => {
        seenKey = key;
        return { success: true };
      },
    };
    globalThis.fetch = completionFetch('ok');
    const response = await invoke(
      apiRequest(JSON.stringify({ question: 'hi' }), { 'CF-Connecting-IP': '198.51.100.9' })
    );
    expect(response.status).toBe(200);
    expect(seenKey).toBe('198.51.100.9');
  });

  test('a forged X-Forwarded-For never mints a limiter key and is denied', async () => {
    const keys: string[] = [];
    workersEnv.RATE_LIMITER = {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: true };
      },
    };
    const response = await invoke(
      apiRequest(JSON.stringify({ question: 'hi' }), {
        'X-Forwarded-For': '10.0.0.1, 203.0.113.7',
      })
    );
    expect(response.status).toBe(429);
    // The limiter must not have been consulted with any forged-header-derived key.
    expect(keys).toEqual([]);
  });

  test('skips rate limiting when no limiter binding exists (local dev)', async () => {
    globalThis.fetch = completionFetch('dev answer');
    const response = await invoke(apiRequest(JSON.stringify({ question: 'hi' })));
    expect(response.status).toBe(200);
  });

  test('rejects a chunked oversized body with no Content-Length before any upstream call', async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as unknown as typeof fetch;
    const huge = JSON.stringify({ question: 'a'.repeat(REQUEST_LIMITS.MAX_BODY_BYTES + 1000) });
    const request = chunkedRequest(huge);
    expect(request.headers.get('Content-Length')).toBeNull();
    const response = await invoke(request);
    expect(response.status).toBe(413);
    expect(called).toBe(false);
  });

  test('collapses two IPv6 addresses in the same /64 to one limiter bucket', async () => {
    const keys: string[] = [];
    workersEnv.RATE_LIMITER = {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: true };
      },
    };
    globalThis.fetch = completionFetch('ok');
    await invoke(
      apiRequest(JSON.stringify({ question: 'hi' }), {
        'CF-Connecting-IP': '2001:db8:1:2:aaaa:bbbb:cccc:dddd',
      })
    );
    await invoke(
      apiRequest(JSON.stringify({ question: 'hi' }), { 'CF-Connecting-IP': '2001:db8:1:2::1' })
    );
    expect(keys).toEqual(['2001:db8:1:2::/64', '2001:db8:1:2::/64']);
  });

  test('denies an absent CF-Connecting-IP under an active limiter with 429', async () => {
    const keys: string[] = [];
    workersEnv.RATE_LIMITER = {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: true };
      },
    };
    const response = await invoke(apiRequest(JSON.stringify({ question: 'hi' })));
    expect(response.status).toBe(429);
    expect(keys).toEqual([]);
  });

  test('returns a generic 500 with no leaked detail when API_KEY is absent', async () => {
    apiKeyValue = undefined;
    globalThis.fetch = completionFetch('should not be reached');
    const response = await invoke(apiRequest(JSON.stringify({ question: 'hi' })));
    expect(response.status).toBe(500);
    const raw = await response.text();
    expect(raw).not.toContain('API_KEY');
    const body = JSON.parse(raw) as { error: string };
    expect(body.error).toBe('Service unavailable');
  });

  test('maps a transport error to a generic 502 without leaking the cause', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED 10.0.0.1:443');
    }) as unknown as typeof fetch;
    const response = await invoke(apiRequest(JSON.stringify({ question: 'hi' })));
    expect(response.status).toBe(502);
    const raw = await response.text();
    expect(raw).not.toContain('ECONNREFUSED');
    const body = JSON.parse(raw) as { error: string };
    expect(body.error).toBe('Upstream request failed');
  });
});
