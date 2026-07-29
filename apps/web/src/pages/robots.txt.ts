import type { APIRoute } from 'astro';
import { resolveSite } from '../lib/site';

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
