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

  // Ordering invariant: bot-token verification precedes rate limiting so an
  // unauthenticated flood is rejected (fail-closed) before it can consume a
  // limiter slot.

  const rateLimited = await enforceRateLimit(request);
  if (rateLimited) {
    return rateLimited;
  }

  // Ordering invariant: the answer cache is consulted after rate limiting, so a
  // cached hit still costs a limiter slot but never a billed upstream call.

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

  return new Response(JSON.stringify(result.response), {
    status: HTTP_STATUS.OK,
    headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
  });
};

/**
 * Reads the request body, rejecting anything past the byte cap. A declared
 * `Content-Length` over the cap is refused without buffering; the post-read
 * length check catches bodies that under-declare or omit the header.
 */
async function readCappedBody(request: Request): Promise<string | null> {
  const declared = request.headers.get('Content-Length');
  if (declared !== null) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > REQUEST_LIMITS.MAX_BODY_BYTES) {
      return null;
    }
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > REQUEST_LIMITS.MAX_BODY_BYTES) {
    return null;
  }
  return new TextDecoder().decode(buffer);
}

/**
 * Rate-limits on the Cloudflare-trusted client IP only. A forged
 * `X-Forwarded-For` can never mint a key, and an absent `CF-Connecting-IP` under
 * an active limiter is denied rather than bucketed under a shared fallback.
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

  const { success } = await limiter.limit({ key: clientIp });
  if (!success) {
    return tooManyRequests();
  }
  return null;
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
