/**
 * API endpoint paths
 */
export const API_ENDPOINTS = {
  GROK: '/api/grok',
} as const;

/**
 * xAI Grok API configuration
 */
export const GROK_API = {
  URL: 'https://api.x.ai/v1/chat/completions',
  MODEL: 'grok-4-1-fast-non-reasoning-latest',
  SYSTEM_PROMPT:
    "You are Grok, created by xAI, providing concise, helpful, and accurate answers for the 'Let me Grok that for you' app.",
  TEMPERATURE: 0,
  STREAM: false,
} as const;

/**
 * HTTP headers
 */
export const HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  JSON: 'application/json',
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Allowed domains for security checks
 */
export const ALLOWED_DOMAINS = ['lmgroktfy.com', 'dev.lmgroktfy.com'] as const;
