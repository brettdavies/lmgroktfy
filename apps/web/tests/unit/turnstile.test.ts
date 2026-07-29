import { describe, expect, test } from 'bun:test';
import { verifyTurnstileToken } from '../../src/lib/turnstile';

const SECRET = '1x0000000000000000000000000000000AA';
const TOKEN = 'x'.repeat(40);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('verifyTurnstileToken', () => {
  test('resolves ok when siteverify reports success', async () => {
    const verdict = await verifyTurnstileToken(TOKEN, SECRET, {
      fetchImpl: async () => jsonResponse({ success: true }),
    });
    expect(verdict.ok).toBe(true);
  });

  test('fails closed as rejected when siteverify reports success:false', async () => {
    const verdict = await verifyTurnstileToken(TOKEN, SECRET, {
      fetchImpl: async () =>
        jsonResponse({ success: false, 'error-codes': ['invalid-input-response'] }),
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toBe('rejected');
    }
  });

  test('fails closed as transport on a network error (never throws)', async () => {
    const verdict = await verifyTurnstileToken(TOKEN, SECRET, {
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED 10.0.0.1:443');
      },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toBe('transport');
    }
  });

  test('fails closed as timeout when the siteverify fetch outlives its own budget', async () => {
    const hangingFetch = (_input: string | URL, init?: RequestInit): Promise<Response> =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      });
    const verdict = await verifyTurnstileToken(TOKEN, SECRET, {
      timeoutMs: 5,
      fetchImpl: hangingFetch,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toBe('timeout');
    }
  });

  test('fails closed as upstream on a non-2xx siteverify response', async () => {
    const verdict = await verifyTurnstileToken(TOKEN, SECRET, {
      fetchImpl: async () => new Response('nope', { status: 500 }),
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toBe('upstream');
    }
  });

  test('fails closed as malformed when siteverify returns non-JSON', async () => {
    const verdict = await verifyTurnstileToken(TOKEN, SECRET, {
      fetchImpl: async () =>
        new Response('<html>oops</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toBe('malformed');
    }
  });

  test('posts secret, response, and remoteip as a form body', async () => {
    let seenBody = '';
    let seenContentType = '';
    await verifyTurnstileToken(TOKEN, SECRET, {
      remoteIp: '203.0.113.7',
      fetchImpl: async (_input, init) => {
        seenBody = String(init?.body ?? '');
        seenContentType = String(
          (init?.headers as Record<string, string> | undefined)?.['Content-Type'] ?? ''
        );
        return jsonResponse({ success: true });
      },
    });
    const params = new URLSearchParams(seenBody);
    expect(params.get('secret')).toBe(SECRET);
    expect(params.get('response')).toBe(TOKEN);
    expect(params.get('remoteip')).toBe('203.0.113.7');
    expect(seenContentType).toContain('application/x-www-form-urlencoded');
  });

  test('omits remoteip when no client IP is supplied', async () => {
    let seenBody = '';
    await verifyTurnstileToken(TOKEN, SECRET, {
      fetchImpl: async (_input, init) => {
        seenBody = String(init?.body ?? '');
        return jsonResponse({ success: true });
      },
    });
    const params = new URLSearchParams(seenBody);
    expect(params.has('remoteip')).toBe(false);
  });
});
