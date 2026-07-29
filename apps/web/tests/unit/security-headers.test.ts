import { describe, expect, test } from 'bun:test';
import {
  CONTENT_SECURITY_POLICY,
  HSTS_HEADER,
  SECURITY_HEADERS,
} from '../../src/lib/security-headers.ts';

describe('shared security headers', () => {
  test('CSP is static: allows self scripts + Turnstile, carries no nonce', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self' https://challenges.cloudflare.com");
    expect(CONTENT_SECURITY_POLICY).toContain('frame-src https://challenges.cloudflare.com');
    expect(CONTENT_SECURITY_POLICY).toContain("style-src 'self' https://cdnjs.cloudflare.com");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toContain('nonce-');
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-inline');
  });

  test('the header map embeds the CSP and the fixed defensive headers', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toBe(CONTENT_SECURITY_POLICY);
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(SECURITY_HEADERS['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(SECURITY_HEADERS['Permissions-Policy']).toBe('geolocation=(), microphone=(), camera=()');
  });

  test('HSTS stays out of the always-on map so it can be applied conditionally', () => {
    expect(SECURITY_HEADERS).not.toHaveProperty('Strict-Transport-Security');
    expect(HSTS_HEADER.name).toBe('Strict-Transport-Security');
    expect(HSTS_HEADER.value).toBe('max-age=31536000; includeSubDomains');
  });
});
