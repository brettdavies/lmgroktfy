import { API_ENDPOINTS, HEADERS, HTTP_STATUS } from '@lmgroktfy/shared';
import { handleGrokRequest } from './api/grok';
import { addCorsHeaders, handleCorsPreflight } from './middleware/cors';
import { validateOrigin } from './middleware/security';
import { handleStaticRequest } from './static/handler';
import type { Env } from './types';

/**
 * Routes incoming requests to the appropriate handler
 */
export async function routeRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCorsPreflight();
  }

  // API routes
  if (url.pathname.startsWith('/api/')) {
    return handleApiRoute(request, env, url.pathname);
  }

  // Static assets
  return handleStaticRequest(request, env);
}

async function handleApiRoute(request: Request, env: Env, pathname: string): Promise<Response> {
  // Security check for API routes
  const securityCheck = validateOrigin(request);
  if (!securityCheck.allowed && securityCheck.response) {
    return addCorsHeaders(securityCheck.response);
  }

  // Rate limiting - use client IP as key
  const clientIP =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';

  // Only apply rate limiting if the binding exists (production)
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: clientIP });
    if (!success) {
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: 'Rate limit exceeded. Please try again later.',
          }),
          {
            status: HTTP_STATUS.TOO_MANY_REQUESTS,
            headers: {
              [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
              'Retry-After': '60',
            },
          }
        )
      );
    }
  }

  // Route to specific API handler
  let response: Response;

  switch (pathname) {
    case API_ENDPOINTS.GROK:
      response = await handleGrokRequest(request, env);
      break;
    default:
      response = new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
  }

  return addCorsHeaders(response);
}
