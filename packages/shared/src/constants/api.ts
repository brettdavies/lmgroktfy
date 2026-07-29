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
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Request-hardening limits for the Grok proxy.
 *
 * `MAX_BODY_BYTES` sits above the worst-case serialized bytes of a
 * `MAX_QUESTION_LENGTH`-code-unit question (6 bytes per unit under full
 * `\uXXXX` escaping) plus a Turnstile token, so a schema-valid question is
 * never rejected by the endpoint body cap.
 */
export const REQUEST_LIMITS = {
  MAX_QUESTION_LENGTH: 2000,
  MAX_BODY_BYTES: 16384,
} as const;

/**
 * Allowed domains for security checks
 */
export const ALLOWED_DOMAINS = ['lmgroktfy.com', 'dev.lmgroktfy.com'] as const;

/**
 * Production custom domains that receive HSTS. Staging (`dev.lmgroktfy.com` and
 * the workers.dev host) is deliberately excluded so a browser is never pinned to
 * https for a non-production host.
 */
export const PRODUCTION_DOMAINS = ['lmgroktfy.com', 'www.lmgroktfy.com'] as const;
