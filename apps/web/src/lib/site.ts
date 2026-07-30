import { DEFAULT_LOCALE } from '@lmgroktfy/shared';

// The configured `site` (apps/web/astro.config.mjs) is always set for this
// project; the fallback only satisfies the `URL | undefined` type Astro
// exposes for sites that omit it.
export function resolveSite(site: URL | undefined): URL {
  return site ?? new URL('https://lmgroktfy.com');
}

export function localeHomePath(locale: string): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
}

export function localeTwinPath(locale: string): string {
  return locale === DEFAULT_LOCALE ? '/index.md' : `/${locale}/index.md`;
}
