/**
 * Build-time Turnstile site key selection.
 *
 * Site keys are public and the widget renders on prerendered pages, so the key
 * is baked into the HTML at build time rather than read from a runtime binding.
 * `CLOUDFLARE_ENV` is the env var the deploy scripts already set for per-env
 * builds; an unset value (local `astro dev`, e2e builds) falls back to
 * Cloudflare's always-pass test key so the local flow never needs live keys.
 */

const PRODUCTION_SITE_KEY = '0x4AAAAAAEAmHJj54x5mc02v';
const STAGING_SITE_KEY = '0x4AAAAAAEAmF7QdqUEQKt7L';
const TEST_SITE_KEY = '1x00000000000000000000AA';

export function getTurnstileSiteKey(): string {
  switch (process.env.CLOUDFLARE_ENV) {
    case 'production':
      return PRODUCTION_SITE_KEY;
    case 'staging':
      return STAGING_SITE_KEY;
    default:
      return TEST_SITE_KEY;
  }
}
