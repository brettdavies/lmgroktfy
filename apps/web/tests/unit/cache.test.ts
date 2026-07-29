import { describe, expect, test } from 'bun:test';
import type { GrokResponse } from '@lmgroktfy/shared';
import {
  CACHE_TTL_SECONDS,
  getCachedAnswer,
  normalizeQuestionKey,
  putCachedAnswer,
} from '../../src/lib/cache';

interface StoredPut {
  key: string;
  value: string;
  expirationTtl?: number;
}

function makeFakeKv(): {
  kv: KVNamespace;
  puts: StoredPut[];
} {
  const store = new Map<string, string>();
  const puts: StoredPut[] = [];
  const kv = {
    get: async (key: string, type?: string) => {
      const raw = store.get(key);
      if (raw === undefined) {
        return null;
      }
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    put: async (key: string, value: string, options?: { expirationTtl?: number }) => {
      store.set(key, value);
      puts.push({ key, value, expirationTtl: options?.expirationTtl });
    },
  } as unknown as KVNamespace;
  return { kv, puts };
}

const answer: GrokResponse = { answer: 'Grok is an AI.', shareId: 'share-1' };

describe('normalizeQuestionKey', () => {
  test('trims, collapses internal whitespace, and lowercases', () => {
    expect(normalizeQuestionKey(' What   is  Grok? ')).toBe('what is grok?');
    expect(normalizeQuestionKey('what is grok?')).toBe('what is grok?');
  });

  test('unicode-normalizes so composed and decomposed forms match', () => {
    const composed = 'café'; // é as a single code point
    const decomposed = 'café'; // e + combining acute accent
    expect(normalizeQuestionKey(composed)).toBe(normalizeQuestionKey(decomposed));
  });

  test('is locale-independent (plain lowercase, not toLocaleLowerCase)', () => {
    expect(normalizeQuestionKey('WHAT IS GROK')).toBe('what is grok');
  });
});

describe('getCachedAnswer', () => {
  test('returns null on a miss', async () => {
    const { kv } = makeFakeKv();
    expect(await getCachedAnswer(kv, 'what is grok?')).toBeNull();
  });

  test('returns null when no binding is present (local dev)', async () => {
    expect(await getCachedAnswer(undefined, 'what is grok?')).toBeNull();
  });

  test('a stored answer is returned for the exact same question', async () => {
    const { kv } = makeFakeKv();
    await putCachedAnswer(kv, 'What is Grok?', answer);
    expect(await getCachedAnswer(kv, 'What is Grok?')).toEqual(answer);
  });

  test('questions differing only in whitespace/case share one cache entry', async () => {
    const { kv } = makeFakeKv();
    await putCachedAnswer(kv, ' What is Grok? ', answer);
    expect(await getCachedAnswer(kv, 'what is grok?')).toEqual(answer);
  });

  test('the URL/locale is never part of the key: two differently-cased locale-irrelevant asks collide', async () => {
    const { kv } = makeFakeKv();
    await putCachedAnswer(kv, 'what is grok?', answer);
    // Same question text as would be posted from /es/what+is+grok or /what+is+grok — the
    // cache never sees a URL, only the question, so both resolve to the same entry.
    expect(await getCachedAnswer(kv, 'What Is Grok?')).toEqual(answer);
  });

  test('treats a malformed stored value as a miss rather than throwing', async () => {
    const { kv } = makeFakeKv();
    const malformed = { not: 'valid' } as unknown as GrokResponse;
    await putCachedAnswer(kv, 'bad', malformed);
    expect(await getCachedAnswer(kv, 'bad')).toBeNull();
  });

  test('degrades to a miss (not a throw) when the KV read fails', async () => {
    const kv = {
      get: async () => {
        throw new Error('KV unavailable');
      },
      put: async () => {},
    } as unknown as KVNamespace;
    expect(await getCachedAnswer(kv, 'what is grok?')).toBeNull();
  });
});

describe('putCachedAnswer', () => {
  test('stores with a ~7-day TTL', async () => {
    const { kv, puts } = makeFakeKv();
    await putCachedAnswer(kv, 'what is grok?', answer);
    expect(puts).toHaveLength(1);
    expect(puts[0]?.expirationTtl).toBe(CACHE_TTL_SECONDS);
    expect(CACHE_TTL_SECONDS).toBe(7 * 24 * 60 * 60);
    expect(JSON.parse(puts[0]?.value ?? '{}')).toEqual(answer);
  });

  test('is a no-op when no binding is present (local dev)', async () => {
    expect(await putCachedAnswer(undefined, 'what is grok?', answer)).toBeUndefined();
  });

  test('swallows a KV write failure without throwing', async () => {
    const kv = {
      get: async () => null,
      put: async () => {
        throw new Error('KV unavailable');
      },
    } as unknown as KVNamespace;
    expect(await putCachedAnswer(kv, 'what is grok?', answer)).toBeUndefined();
  });
});
