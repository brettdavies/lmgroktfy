/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
  /** xAI API key for Grok */
  API_KEY: string;

  /** Current environment (development/production) */
  ENVIRONMENT: string;

  /** Cloudflare Workers Assets binding for static files */
  ASSETS: Fetcher;

  /** Rate limiter binding for API protection */
  RATE_LIMITER: RateLimiter;
}

/**
 * Cloudflare Rate Limiter binding interface
 * @see https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
