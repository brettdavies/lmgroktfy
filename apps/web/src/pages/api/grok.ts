import {
  type GrokError,
  GrokRequestSchema,
  HEADERS,
  HTTP_STATUS,
  REQUEST_LIMITS,
} from '@lmgroktfy/shared';
import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { env } from 'cloudflare:workers';
import { getCachedAnswer, putCachedAnswer } from '../../lib/cache';
import { callXai } from '../../lib/xai';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await readCappedBody(request);
  if (rawBody === null) {
    return errorResponse('Request body too large', HTTP_STATUS.PAYLOAD_TOO_LARGE);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse('Invalid request', HTTP_STATUS.BAD_REQUEST);
  }

  const validation = GrokRequestSchema.safeParse(payload);
  if (!validation.success) {
    return errorResponse('Invalid request', HTTP_STATUS.BAD_REQUEST);
  }
  const { question } = validation.data;

  const rateLimited = await enforceRateLimit(request);
  if (rateLimited) {
    return rateLimited;
  }

  const cached = await getCachedAnswer(env.ANSWER_CACHE, question);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: HTTP_STATUS.OK,
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
    });
  }

  const apiKey = getSecret('API_KEY');
  if (!apiKey) {
    console.error('grok: API_KEY secret is not configured');
    return errorResponse('Service unavailable', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  const result = await callXai(question, apiKey);
  if (!result.ok) {
    console.error(`grok: xAI call failed (${result.reason}): ${result.detail}`);
    if (result.reason === 'timeout') {
      return errorResponse('Upstream request timed out', HTTP_STATUS.GATEWAY_TIMEOUT);
    }
    return errorResponse('Upstream request failed', HTTP_STATUS.BAD_GATEWAY);
  }

  await putCachedAnswer(env.ANSWER_CACHE, question, result.response);

  return new Response(JSON.stringify(result.response), {
    status: HTTP_STATUS.OK,
    headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
  });
};

/**
 * Reads the request body, rejecting anything past the byte cap. A declared
 * `Content-Length` over the cap is refused without reading. The body is then
 * consumed as a stream with a running byte count so a chunked or
 * under-declared payload is abandoned the moment it crosses the cap rather than
 * fully buffered.
 */
async function readCappedBody(request: Request): Promise<string | null> {
  const declared = request.headers.get('Content-Length');
  if (declared !== null) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > REQUEST_LIMITS.MAX_BODY_BYTES) {
      return null;
    }
  }

  const body = request.body;
  if (!body) {
    return '';
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > REQUEST_LIMITS.MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * Rate-limits on the Cloudflare-trusted client IP only. A forged
 * `X-Forwarded-For` can never mint a key, and an absent `CF-Connecting-IP` under
 * an active limiter is denied rather than bucketed under a shared fallback. The
 * key is normalized so a routed IPv6 allocation collapses to its /64 prefix and
 * cannot spread one client across 2^64 buckets.
 */
async function enforceRateLimit(request: Request): Promise<Response | null> {
  const limiter = env.RATE_LIMITER;
  if (!limiter) {
    return null;
  }

  const clientIp = request.headers.get('CF-Connecting-IP');
  if (!clientIp) {
    return tooManyRequests();
  }

  const { success } = await limiter.limit({ key: normalizeClientIp(clientIp) });
  if (!success) {
    return tooManyRequests();
  }
  return null;
}

/**
 * Reduces an IPv6 address to its /64 routing prefix so a single client cannot
 * mint a distinct limiter key per address in its allocation. IPv4 addresses key
 * whole; an unparseable value keys as-is (still bucketed, never dropped).
 */
function normalizeClientIp(ip: string): string {
  if (!ip.includes(':')) {
    return ip;
  }
  const groups = expandIpv6(ip);
  if (!groups) {
    return ip;
  }
  return `${groups.slice(0, 4).join(':')}::/64`;
}

function expandIpv6(ip: string): string[] | null {
  const bare = ip.replace(/^\[|\]$/g, '').split('%')[0];
  const halves = bare.split('::');
  if (halves.length > 2) {
    return null;
  }
  const head = halves[0] ? halves[0].split(':') : [];
  if (halves.length === 1) {
    return head.length === 8 ? head : null;
  }
  const tail = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0) {
    return null;
  }
  return [...head, ...Array(missing).fill('0'), ...tail];
}

function tooManyRequests(): Response {
  return errorResponse('Rate limit exceeded', HTTP_STATUS.TOO_MANY_REQUESTS, {
    'Retry-After': '60',
  });
}

function errorResponse(
  error: string,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  const body: GrokError = { error };
  return new Response(JSON.stringify(body), {
    status,
    headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON, ...extraHeaders },
  });
}
