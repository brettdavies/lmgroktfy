import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@lmgroktfy/shared';

function localeHomePath(locale: string): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
}

// The configured `site` (apps/web/astro.config.mjs) is always set for this
// project; the fallback only satisfies the `URL | undefined` type Astro
// exposes for sites that omit it.
function resolveSite(site: URL | undefined): URL {
  return site ?? new URL('https://lmgroktfy.com');
}

function buildSitemapXml(site: URL): string {
  const urlEntries = SUPPORTED_LOCALES.map((locale) => {
    const loc = new URL(localeHomePath(locale), site).toString();
    return `  <url>\n    <loc>${loc}</loc>\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

export const GET: APIRoute = ({ site }) => {
  return new Response(buildSitemapXml(resolveSite(site)), {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
