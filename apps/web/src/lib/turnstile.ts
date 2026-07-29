import { HEADERS } from '@lmgroktfy/shared';
import { describeError, isAbort } from './errors';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded';
const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Outcome of a Turnstile siteverify call. `detail` is for server-side logging
 * only; the caller must map every failure to a generic client response so no
 * siteverify error code or infrastructure state leaks. `rejected` means
 * Cloudflare positively denied the token (invalid/expired/replayed); the other
 * reasons mean the verification itself could not complete and the request must
 * still fail closed.
 */
export type TurnstileVerdict =
  | { ok: true }
  | {
      ok: false;
      reason: 'rejected' | 'transport' | 'timeout' | 'upstream' | 'malformed';
      detail: string;
    };

/**
 * Structural fetch signature. Avoids depending on which ambient `fetch` global
 * type is in scope so the call can be exercised with a plain stub.
 */
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface VerifyOptions {
  remoteIp?: string | null;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

/**
 * Verifies a Turnstile token against Cloudflare siteverify under its own short
 * timeout and fails closed. Never throws: a timeout, transport error, non-2xx
 * response, or unparseable body all resolve to a typed failure so the caller
 * denies the request rather than proceed on an unverified token.
 */
export async function verifyTurnstileToken(
  token: string,
  secret: string,
  options: VerifyOptions = {}
): Promise<TurnstileVerdict> {
  const { remoteIp, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch as FetchLike } = options;

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteIp) {
    form.set('remoteip', remoteIp);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetchImpl(SITEVERIFY_URL, {
        method: 'POST',
        headers: { [HEADERS.CONTENT_TYPE]: FORM_CONTENT_TYPE },
        body: form.toString(),
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbort(controller, error)) {
        return { ok: false, reason: 'timeout', detail: `siteverify aborted after ${timeoutMs}ms` };
      }
      return { ok: false, reason: 'transport', detail: describeError(error) };
    }

    if (!response.ok) {
      return { ok: false, reason: 'upstream', detail: `siteverify HTTP ${response.status}` };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (isAbort(controller, error)) {
        return { ok: false, reason: 'timeout', detail: `siteverify aborted after ${timeoutMs}ms` };
      }
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: 'malformed', detail: `siteverify body was not JSON: ${detail}` };
    }

    if (!isSiteverifyShape(payload)) {
      return { ok: false, reason: 'malformed', detail: 'siteverify response was not the expected shape' };
    }
    if (payload.success !== true) {
      return { ok: false, reason: 'rejected', detail: `siteverify rejected: ${errorCodesOf(payload)}` };
    }
    return { ok: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Anything but a strict `success === true` fails closed, so validation only has
 * to confirm the body is an object carrying a boolean `success`.
 */
function isSiteverifyShape(payload: unknown): payload is { success: boolean; 'error-codes'?: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as { success?: unknown }).success === 'boolean'
  );
}

function errorCodesOf(payload: { 'error-codes'?: unknown }): string {
  const codes = payload['error-codes'];
  if (!Array.isArray(codes)) {
    return 'no-error-codes';
  }
  return codes.filter((code): code is string => typeof code === 'string').join(',') || 'no-error-codes';
}
