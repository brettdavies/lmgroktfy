import type { APIRoute } from 'astro';

// The configured `site` (apps/web/astro.config.mjs) is always set for this
// project; the fallback only satisfies the `URL | undefined` type Astro
// exposes for sites that omit it.
function resolveSite(site: URL | undefined): URL {
  return site ?? new URL('https://lmgroktfy.com');
}

function buildRobotsTxt(site: URL): string {
  const sitemapUrl = new URL('/sitemap.xml', site).toString();

  return `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
}

export const GET: APIRoute = ({ site }) => {
  return new Response(buildRobotsTxt(resolveSite(site)), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
