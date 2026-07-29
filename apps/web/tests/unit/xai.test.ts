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
});
