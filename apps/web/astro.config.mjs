import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { HSTS_HEADER, SECURITY_HEADERS } from './src/lib/security-headers.ts';

/**
 * Cloudflare serves prerendered pages and static files from the ASSETS layer
 * without invoking the Worker, so the middleware's security headers never reach
 * them. This writes the same header map into `dist/client/_headers` so those
 * static responses carry the identical policy. The Cloudflare adapter's own
 * `astro:build:done` hook prepends an immutable `Cache-Control` rule for
 * `/_astro/*` to this file; the security block is appended so both survive
 * regardless of hook order (the `/*` rule declares no `Cache-Control`, so the
 * adapter still injects its own). HSTS is emitted only for production builds,
 * matching the middleware's host-scoped rule.
 */
function staticSecurityHeaders() {
  return {
    name: 'static-security-headers',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const headersPath = fileURLToPath(new URL('./_headers', dir));

        let existing = '';
        try {
          existing = await readFile(headersPath, 'utf-8');
        } catch {
          // Adapter has not written `_headers` yet; start from an empty file.
        }
        if (existing.includes('Content-Security-Policy')) {
          return;
        }

        const rules = ['/*'];
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
          rules.push(`  ${name}: ${value}`);
        }
        if (process.env.CLOUDFLARE_ENV === 'production') {
          rules.push(`  ${HSTS_HEADER.name}: ${HSTS_HEADER.value}`);
        }

        const block = `${rules.join('\n')}\n`;
        const normalized = existing && !existing.endsWith('\n') ? `${existing}\n` : existing;
        await writeFile(headersPath, `${normalized}${block}`, 'utf-8');
      },
    },
  };
}

export default defineConfig({
  site: 'https://lmgroktfy.com',
  adapter: cloudflare(),
  integrations: [staticSecurityHeaders()],
  // Never inline a small CSS chunk as a `<style>` element: the static CSP ships
  // `style-src 'self'` with no `'unsafe-inline'`, so an inlined stylesheet would
  // be blocked. Emitting every stylesheet as an external `self` asset keeps the
  // build within the policy regardless of chunk size.
  build: { inlineStylesheets: 'never' },
  i18n: {
    locales: ['ar', 'de', 'en', 'es', 'fr', 'ja'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
