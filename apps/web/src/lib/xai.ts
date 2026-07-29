import {
  GROK_API,
  type GrokResponse,
  GrokResponseSchema,
  HEADERS,
  XAICompletionResponseSchema,
} from '@lmgroktfy/shared';

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Outcome of a call to the xAI upstream. `detail` is for server-side logging
 * only; callers must map every failure to a generic client-facing message so no
 * upstream or exception text is leaked.
 */
export type XaiResult =
  | { ok: true; response: GrokResponse }
  | { ok: false; reason: 'timeout' | 'transport' | 'upstream' | 'malformed'; detail: string };

/**
 * Structural fetch signature. Avoids depending on which ambient `fetch` global
 * type is in scope so the upstream call can be exercised with a plain stub.
 */
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface XaiCallOptions {
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

/**
 * Calls the xAI chat-completions API for a single question under an
 * `AbortController` timeout and returns a discriminated result. Never throws:
 * timeouts, transport errors, non-2xx responses, and malformed payloads are all
 * returned as typed failures.
 */
export async function callXai(
  question: string,
  apiKey: string,
  options: XaiCallOptions = {}
): Promise<XaiResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch as FetchLike } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let upstream: Response;
  try {
    upstream = await fetchImpl(GROK_API.URL, {
      method: 'POST',
      headers: {
        [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
        [HEADERS.AUTHORIZATION]: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_API.MODEL,
        messages: [
          { role: 'system', content: GROK_API.SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        stream: GROK_API.STREAM,
        temperature: GROK_API.TEMPERATURE,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = controller.signal.aborted || (error instanceof Error && error.name === 'AbortError');
    if (aborted) {
      return { ok: false, reason: 'timeout', detail: `xAI request aborted after ${timeoutMs}ms` };
    }
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { ok: false, reason: 'transport', detail };
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    return { ok: false, reason: 'upstream', detail: `xAI ${upstream.status}: ${await safeText(upstream)}` };
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: 'malformed', detail: `xAI body was not JSON: ${detail}` };
  }

  const parsed = XAICompletionResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, reason: 'malformed', detail: 'xAI response failed schema validation' };
  }

  const response: GrokResponse = {
    answer: parsed.data.choices[0]?.message?.content || 'No answer provided',
    shareId: parsed.data.id,
  };

  const validated = GrokResponseSchema.safeParse(response);
  if (!validated.success) {
    return { ok: false, reason: 'malformed', detail: 'assembled response failed schema validation' };
  }

  return { ok: true, response: validated.data };
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<unreadable>';
  }
}
