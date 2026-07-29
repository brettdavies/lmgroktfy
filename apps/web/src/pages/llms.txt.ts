import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@lmgroktfy/shared';

function localeHomePath(locale: string): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
}

function localeTwinPath(locale: string): string {
  return locale === DEFAULT_LOCALE ? '/index.md' : `/${locale}/index.md`;
}

// The configured `site` (apps/web/astro.config.mjs) is always set for this
// project; the fallback only satisfies the `URL | undefined` type Astro
// exposes for sites that omit it.
function resolveSite(site: URL | undefined): URL {
  return site ?? new URL('https://lmgroktfy.com');
}

function buildLlmsTxt(site: URL): string {
  const routeLines = SUPPORTED_LOCALES.map(
    (locale) => `- ${new URL(localeHomePath(locale), site).toString()} (${locale})`,
  ).join('\n');
  const twinLines = SUPPORTED_LOCALES.map(
    (locale) => `- ${new URL(localeTwinPath(locale), site).toString()} (${locale})`,
  ).join('\n');

  return `# lmgroktfy

> lmgroktfy is a UI that lets a visitor ask a question in plain language and view an AI-generated answer from Grok, rendered on a shareable page. This file describes the site's content and structure for agents. It publishes no callable API endpoint, method, or invocation schema; the "ask Grok" capability is UI-mediated, rate-limited, and challenge-protected.

## Locale routes

${routeLines}

## Markdown twins

Each locale route above has a plain-markdown twin at the paths below, linked from the HTML page via a \`rel="alternate" type="text/markdown"\` link.

${twinLines}
`;
}

export const GET: APIRoute = ({ site }) => {
  return new Response(buildLlmsTxt(resolveSite(site)), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
