import { describe, expect, test } from 'bun:test';
import { EXTERNAL_URLS } from '../constants/ui';
import {
  encodeQuestionForUrl,
  extractQuestionFromUrl,
  getGrokUrl,
  getXGrokUrl,
  isLocalDevelopment,
} from '../utils/url';

describe('encodeQuestionForUrl', () => {
  test('should encode a simple question', () => {
    expect(encodeQuestionForUrl('What is TypeScript?')).toBe('What%20is%20TypeScript%3F');
  });

  test('should encode special characters', () => {
    expect(encodeQuestionForUrl('1+1=2')).toBe('1%2B1%3D2');
  });

  test('should handle empty string', () => {
    expect(encodeQuestionForUrl('')).toBe('');
  });

  test('should encode unicode characters', () => {
    const encoded = encodeQuestionForUrl('Hello 世界');
    expect(encoded).toContain('%');
    expect(decodeURIComponent(encoded)).toBe('Hello 世界');
  });
});

describe('getGrokUrl', () => {
  test('should generate correct Grok URL', () => {
    const url = getGrokUrl('What is Bun?');
    expect(url).toContain(EXTERNAL_URLS.GROK_BASE);
    expect(url).toContain('q=What%20is%20Bun%3F');
    expect(url).toContain(`utm_source=${EXTERNAL_URLS.UTM_SOURCE}`);
  });

  test('should handle special characters in question', () => {
    const url = getGrokUrl('How do I use && in bash?');
    expect(url).toContain('%26%26');
  });
});

describe('getXGrokUrl', () => {
  test('should generate correct X/Grok URL', () => {
    const url = getXGrokUrl('What is Bun?');
    expect(url).toContain(EXTERNAL_URLS.GROK_X_BASE);
    expect(url).toContain('text=What%20is%20Bun%3F');
    expect(url).toContain(`utm_source=${EXTERNAL_URLS.UTM_SOURCE}`);
  });
});

describe('isLocalDevelopment', () => {
  test('should return true for localhost', () => {
    expect(isLocalDevelopment('localhost')).toBe(true);
  });

  test('should return true for 127.0.0.1', () => {
    expect(isLocalDevelopment('127.0.0.1')).toBe(true);
  });

  test('should return true for 192.168.x.x addresses', () => {
    expect(isLocalDevelopment('192.168.1.1')).toBe(true);
    expect(isLocalDevelopment('192.168.0.100')).toBe(true);
  });

  test('should return true for 10.x.x.x addresses', () => {
    expect(isLocalDevelopment('10.0.0.1')).toBe(true);
    expect(isLocalDevelopment('10.255.255.255')).toBe(true);
  });

  test('should return true for 172.16-31.x.x addresses', () => {
    expect(isLocalDevelopment('172.16.0.1')).toBe(true);
    expect(isLocalDevelopment('172.31.255.255')).toBe(true);
  });

  test('should return false for public domains', () => {
    expect(isLocalDevelopment('lmgroktfy.com')).toBe(false);
    expect(isLocalDevelopment('example.com')).toBe(false);
  });

  test('should return false for public IPs', () => {
    expect(isLocalDevelopment('8.8.8.8')).toBe(false);
    expect(isLocalDevelopment('172.32.0.1')).toBe(false);
  });
});

describe('extractQuestionFromUrl', () => {
  test('should extract question from q parameter', () => {
    expect(extractQuestionFromUrl('http://localhost/?q=What%20is%20Bun%3F')).toBe('What is Bun?');
  });

  test('should extract question from question parameter', () => {
    expect(extractQuestionFromUrl('http://localhost/?question=Hello%20World')).toBe('Hello World');
  });

  test('should extract question from path', () => {
    expect(extractQuestionFromUrl('http://localhost/What%20is%20Bun')).toBe('What is Bun');
  });

  test('should handle plus signs in path as spaces', () => {
    expect(extractQuestionFromUrl('http://localhost/Hello+World')).toBe('Hello World');
  });

  test('should return null for empty path and no query', () => {
    expect(extractQuestionFromUrl('http://localhost/')).toBe(null);
  });

  test('should prefer query parameter over path', () => {
    expect(extractQuestionFromUrl('http://localhost/path?q=query')).toBe('query');
  });

  test('should handle relative URLs', () => {
    expect(extractQuestionFromUrl('/?q=test')).toBe('test');
    expect(extractQuestionFromUrl('/question%20here')).toBe('question here');
  });

  test('should return null for invalid URLs', () => {
    // The function handles invalid URLs gracefully with try/catch
    expect(extractQuestionFromUrl('')).toBe(null);
  });
});
