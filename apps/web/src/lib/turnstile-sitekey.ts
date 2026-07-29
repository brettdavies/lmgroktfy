/**
 * Build-time Turnstile site key selection.
 *
 * Site keys are public and the widget renders on prerendered pages, so the key
 * is baked into the HTML at build time rather than read from a runtime binding.
 * The selector runs inside a prerendered component whose SSR bundle cannot see
 * the build shell's `process.env`, so it reads `import.meta.env.CLOUDFLARE_ENV`,
 * which `astro.config.mjs` injects from the main process via a Vite `define`. An
 * unset environment (local `astro dev`, e2e builds) resolves to the default and
 * falls back to Cloudflare's always-pass test key so the local flow never needs
 * live keys.
 */

const PRODUCTION_SITE_KEY = '0x4AAAAAAEAmHJj54x5mc02v';
const STAGING_SITE_KEY = '0x4AAAAAAEAmF7QdqUEQKt7L';
const TEST_SITE_KEY = '1x00000000000000000000AA';

export function getTurnstileSiteKey(): string {
  switch (import.meta.env.CLOUDFLARE_ENV) {
    case 'production':
      return PRODUCTION_SITE_KEY;
    case 'staging':
      return STAGING_SITE_KEY;
    default:
      return TEST_SITE_KEY;
  }
}
