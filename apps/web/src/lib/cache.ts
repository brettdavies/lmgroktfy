import { type GrokResponse, GrokResponseSchema } from '@lmgroktfy/shared';
import { describeError } from './errors';

/** ~1 week: bounds spend/latency on a repeated question without holding it indefinitely. */
export const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const CACHE_KEY_PREFIX = 'answer:';

/**
 * Collapses a question to a locale- and formatting-independent identity: unicode-normalized,
 * trimmed, internal whitespace runs collapsed, lowercased. `/es/what+is+grok` and
 * `/what+is+grok` must resolve to the same entry because the answer depends on the question,
 * not the UI locale.
 */
export function normalizeQuestionKey(question: string): string {
  return question.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * KV keys are capped at 512 bytes; a normalized question can exceed that (MAX_QUESTION_LENGTH
 * is 2000 UTF-16 units, up to 6 bytes each under full Unicode). Hashing the normalized text
 * into a fixed-width key sidesteps the limit while keeping the cache keyed on question
 * identity rather than the raw text.
 */
async function cacheKeyFor(question: string): Promise<string> {
  const normalized = normalizeQuestionKey(question);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${CACHE_KEY_PREFIX}${hex}`;
}

/**
 * Reads a cached answer for the normalized question. Returns null on a miss, an absent
 * binding, or any KV read failure (malformed stored value included) so the caller always
 * falls through to a live xAI call rather than surface a cache error to the client.
 */
export async function getCachedAnswer(
  kv: KVNamespace | undefined,
  question: string
): Promise<GrokResponse | null> {
  if (!kv) {
    return null;
  }
  try {
    const key = await cacheKeyFor(question);
    const stored = await kv.get(key, 'json');
    const parsed = GrokResponseSchema.safeParse(stored);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.error(`cache: read failed, falling through to a live call: ${describeError(error)}`);
    return null;
  }
}

/**
 * Stores an answer for the normalized question with a 7-day TTL. Failures are logged and
 * swallowed so a KV outage never turns an already-successful xAI call into a 500 for the
 * caller.
 */
export async function putCachedAnswer(
  kv: KVNamespace | undefined,
  question: string,
  response: GrokResponse
): Promise<void> {
  if (!kv) {
    return;
  }
  try {
    const key = await cacheKeyFor(question);
    await kv.put(key, JSON.stringify(response), { expirationTtl: CACHE_TTL_SECONDS });
  } catch (error) {
    console.error(`cache: write failed, answer not cached: ${describeError(error)}`);
  }
}
