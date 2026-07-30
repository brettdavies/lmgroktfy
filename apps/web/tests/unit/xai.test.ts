import { describe, expect, test } from 'bun:test';
import { GROK_API } from '@lmgroktfy/shared';
import { callXai } from '../../src/lib/xai';

function completion(content: string, id = 'share-1'): Response {
  return new Response(JSON.stringify({ id, choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('callXai', () => {
  test('returns a validated GrokResponse on a successful completion', async () => {
    const result = await callXai('What is Grok?', 'key', {
      fetchImpl: async () => completion('Grok is an AI.', 'abc123'),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.answer).toBe('Grok is an AI.');
      expect(result.response.shareId).toBe('abc123');
    }
  });

  test('sends the Bearer key and question to the xAI URL', async () => {
    const seen = { url: '', auth: '' };
    await callXai('hello', 'secret-key', {
      fetchImpl: async (url, init) => {
        seen.url = String(url);
        seen.auth = new Headers(init?.headers).get('Authorization') ?? '';
        return completion('hi');
      },
    });
    expect(seen.url).toBe(GROK_API.URL);
    expect(seen.auth).toBe('Bearer secret-key');
  });

  test('times out a hanging upstream via AbortController (no hang)', async () => {
    const start = Date.now();
    const result = await callXai('slow', 'key', {
      timeoutMs: 25,
      fetchImpl: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('timeout');
    }
    expect(Date.now() - start).toBeLessThan(2000);
  });

  test('reports an upstream non-2xx without exposing the body to callers', async () => {
    const result = await callXai('q', 'key', {
      fetchImpl: async () => new Response('UPSTREAM_STACK_TRACE', { status: 500 }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('upstream');
      // Detail is retained for server-side logging only.
      expect(result.detail).toContain('500');
    }
  });

  test('aborts a response that returns headers but hangs the body read', async () => {
    const start = Date.now();
    const result = await callXai('slow-body', 'key', {
      timeoutMs: 25,
      fetchImpl: (_url, init) => {
        const stream = new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener('abort', () =>
              controller.error(new DOMException('Aborted', 'AbortError'))
            );
          },
        });
        return Promise.resolve(
          new Response(stream, { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('timeout');
    }
    expect(Date.now() - start).toBeLessThan(2000);
  });

  test('reports a transport failure without exposing the cause', async () => {
    const result = await callXai('q', 'key', {
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED 10.0.0.1:443');
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('transport');
    }
  });

  test('reports a malformed upstream payload', async () => {
    const result = await callXai('q', 'key', {
      fetchImpl: async () =>
        new Response(JSON.stringify({ nope: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('malformed');
    }
  });

  test('treats an empty content as malformed rather than a placeholder answer', async () => {
    const result = await callXai('q', 'key', {
      fetchImpl: async () => completion(''),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('malformed');
    }
  });

  test('treats a whitespace-only content as malformed', async () => {
    const result = await callXai('q', 'key', {
      fetchImpl: async () => completion('   \n\t  '),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('malformed');
    }
  });

  test('treats absent choices as malformed', async () => {
    const result = await callXai('q', 'key', {
      fetchImpl: async () =>
        new Response(JSON.stringify({ id: 'share-1', choices: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('malformed');
    }
  });
});
