import { describe, expect, test } from 'bun:test';
import { addCorsHeaders, handleCorsPreflight } from '../middleware/cors';

describe('addCorsHeaders', () => {
  test('should add CORS headers to response', () => {
    const originalResponse = new Response('test body', { status: 200 });
    const corsResponse = addCorsHeaders(originalResponse);

    expect(corsResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(corsResponse.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(corsResponse.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    expect(corsResponse.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  test('should preserve original response status', () => {
    const originalResponse = new Response('error', { status: 500 });
    const corsResponse = addCorsHeaders(originalResponse);

    expect(corsResponse.status).toBe(500);
  });

  test('should preserve original response body', async () => {
    const originalResponse = new Response('test body');
    const corsResponse = addCorsHeaders(originalResponse);

    const body = await corsResponse.text();
    expect(body).toBe('test body');
  });

  test('should preserve existing headers', () => {
    const originalResponse = new Response('test', {
      headers: { 'X-Custom-Header': 'custom-value' },
    });
    const corsResponse = addCorsHeaders(originalResponse);

    expect(corsResponse.headers.get('X-Custom-Header')).toBe('custom-value');
    expect(corsResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('handleCorsPreflight', () => {
  test('should return 204 No Content status', () => {
    const response = handleCorsPreflight();
    expect(response.status).toBe(204);
  });

  test('should include all CORS headers', () => {
    const response = handleCorsPreflight();

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  test('should have null body', async () => {
    const response = handleCorsPreflight();
    const body = await response.text();
    expect(body).toBe('');
  });
});
