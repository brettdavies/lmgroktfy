import { describe, expect, test } from 'bun:test';
import { validateOrigin } from '../middleware/security';

function createRequest(options: { origin?: string; referer?: string; zoneName?: string }): Request {
  const headers: Record<string, string> = {};
  if (options.origin) headers.Origin = options.origin;
  if (options.referer) headers.Referer = options.referer;

  const request = new Request('https://example.com/api/grok', {
    method: 'POST',
    headers,
  });

  // Mock Cloudflare-specific properties
  if (options.zoneName !== undefined) {
    Object.defineProperty(request, 'cf', {
      value: { zoneName: options.zoneName },
      writable: true,
    });
  }

  return request;
}

describe('validateOrigin', () => {
  describe('in development (no zoneName)', () => {
    test('should allow all origins in development', () => {
      const request = createRequest({});
      const result = validateOrigin(request);
      expect(result.allowed).toBe(true);
      expect(result.response).toBeUndefined();
    });

    test('should allow any referer in development', () => {
      const request = createRequest({
        referer: 'https://evil.com/',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(true);
    });
  });

  describe('in production (with zoneName)', () => {
    test('should allow valid zone without origin/referer', () => {
      const request = createRequest({
        zoneName: 'lmgroktfy.com',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(true);
    });

    test('should reject invalid zone', async () => {
      const request = createRequest({
        zoneName: 'evil.com',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(false);
      expect(result.response).toBeDefined();

      const body = await result.response?.json();
      expect(body.error).toContain('Invalid zone');
    });

    test('should allow valid referer from lmgroktfy.com', () => {
      const request = createRequest({
        zoneName: 'lmgroktfy.com',
        referer: 'https://lmgroktfy.com/page',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(true);
    });

    test('should allow valid referer from subdomain', () => {
      const request = createRequest({
        zoneName: 'lmgroktfy.com',
        referer: 'https://www.lmgroktfy.com/page',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(true);
    });

    test('should reject invalid referer', async () => {
      const request = createRequest({
        zoneName: 'lmgroktfy.com',
        referer: 'https://evil.com/page',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(false);

      const body = await result.response?.json();
      expect(body.error).toContain('Invalid referer');
    });

    test('should reject malformed referer', async () => {
      const request = createRequest({
        zoneName: 'lmgroktfy.com',
        referer: 'not-a-valid-url',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(false);

      const body = await result.response?.json();
      expect(body.error).toContain('Invalid referer format');
    });

    test('should allow valid origin header', () => {
      const request = createRequest({
        zoneName: 'lmgroktfy.com',
        origin: 'https://lmgroktfy.com',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(true);
    });

    test('should reject invalid origin header', async () => {
      const request = createRequest({
        zoneName: 'lmgroktfy.com',
        origin: 'https://evil.com',
      });
      const result = validateOrigin(request);
      expect(result.allowed).toBe(false);

      const body = await result.response?.json();
      expect(body.error).toContain('Invalid origin');
    });
  });
});
