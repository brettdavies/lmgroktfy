import { HTTP_STATUS } from '@lmgroktfy/shared';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
} as const;

/**
 * Adds CORS headers to a response
 */
export function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Handles CORS preflight requests
 */
export function handleCorsPreflight(): Response {
  return new Response(null, {
    status: HTTP_STATUS.NO_CONTENT,
    headers: CORS_HEADERS,
  });
}
