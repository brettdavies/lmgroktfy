import { afterEach, describe, expect, test } from 'bun:test';
import { getTurnstileSiteKey } from '../../src/lib/turnstile-sitekey';

// The selector reads `import.meta.env.CLOUDFLARE_ENV`, which the Vite `define` in
// astro.config.mjs bakes from the main process at build time. Under `bun test`
// that same expression resolves to `process.env.CLOUDFLARE_ENV` at runtime, so
// the per-env mapping is exercised by mutating the variable per case.
const original = process.env.CLOUDFLARE_ENV;

afterEach(() => {
  if (original === undefined) {
    delete process.env.CLOUDFLARE_ENV;
  } else {
    process.env.CLOUDFLARE_ENV = original;
  }
});

describe('getTurnstileSiteKey', () => {
  test('production maps to the production site key', () => {
    process.env.CLOUDFLARE_ENV = 'production';
    expect(getTurnstileSiteKey()).toBe('0x4AAAAAAEAmHJj54x5mc02v');
  });

  test('staging maps to the staging site key', () => {
    process.env.CLOUDFLARE_ENV = 'staging';
    expect(getTurnstileSiteKey()).toBe('0x4AAAAAAEAmF7QdqUEQKt7L');
  });

  test('an unset environment falls back to the Cloudflare test key', () => {
    delete process.env.CLOUDFLARE_ENV;
    expect(getTurnstileSiteKey()).toBe('1x00000000000000000000AA');
  });

  test('an unknown environment falls back to the Cloudflare test key', () => {
    process.env.CLOUDFLARE_ENV = 'preview';
    expect(getTurnstileSiteKey()).toBe('1x00000000000000000000AA');
  });
});
