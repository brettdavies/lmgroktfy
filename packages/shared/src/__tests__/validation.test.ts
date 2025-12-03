import { describe, expect, test } from 'bun:test';
import { isNonEmptyString, validateGrokRequest } from '../utils/validation';

describe('validateGrokRequest', () => {
  test('should return success for valid request', () => {
    const result = validateGrokRequest({ question: 'What is Bun?' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe('What is Bun?');
    }
  });

  test('should return error for empty question', () => {
    const result = validateGrokRequest({ question: '' });
    expect(result.success).toBe(false);
  });

  test('should return error for missing question', () => {
    const result = validateGrokRequest({});
    expect(result.success).toBe(false);
  });

  test('should return error for null input', () => {
    const result = validateGrokRequest(null);
    expect(result.success).toBe(false);
  });

  test('should return error for undefined input', () => {
    const result = validateGrokRequest(undefined);
    expect(result.success).toBe(false);
  });

  test('should return error for non-object input', () => {
    const result = validateGrokRequest('string');
    expect(result.success).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  test('should return true for non-empty string', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  test('should return false for empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  test('should return false for whitespace-only string', () => {
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString('\t\n')).toBe(false);
  });

  test('should return true for string with leading/trailing whitespace', () => {
    expect(isNonEmptyString('  hello  ')).toBe(true);
  });

  test('should return false for null', () => {
    expect(isNonEmptyString(null)).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(isNonEmptyString(undefined)).toBe(false);
  });

  test('should return false for number', () => {
    expect(isNonEmptyString(123)).toBe(false);
  });

  test('should return false for object', () => {
    expect(isNonEmptyString({})).toBe(false);
  });

  test('should return false for array', () => {
    expect(isNonEmptyString([])).toBe(false);
  });
});
