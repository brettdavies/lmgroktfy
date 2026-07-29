import { extname, join, normalize } from 'node:path';

/**
 * Serves the built `dist/client` for e2e. Real asset/page files win; any other
 * path falls back to the root `index.html`, which mirrors production: the SSR
 * `[...q]` catch-all renders the same shell for `/your+question` deep links, and
 * the island reads the question from `window.location.pathname`. No middleware
 * runs here, so the client-side `?lang=` redirect is exercised in isolation.
 */

const ROOT = join(import.meta.dir, '../../dist/client');
const PORT = Number(process.env.E2E_PORT ?? 4331);

function safeJoin(path: string): string {
  const resolved = normalize(join(ROOT, path));
  return resolved.startsWith(ROOT) ? resolved : ROOT;
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const path = decodeURIComponent(pathname);

    // Asset requests (with an extension) must resolve to a real file or 404 —
    // never fall back to HTML, or a missing script would be served as a page.
    if (extname(path) && !path.endsWith('.html')) {
      const asset = Bun.file(safeJoin(path));
      return (await asset.exists()) ? new Response(asset) : new Response('Not found', { status: 404 });
    }

    for (const candidate of [join(path, 'index.html'), `${path.replace(/\/$/, '')}.html`]) {
      const file = Bun.file(safeJoin(candidate));
      if (await file.exists()) return new Response(file);
    }

    return new Response(Bun.file(join(ROOT, 'index.html')), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
});

console.log(`e2e static server: http://localhost:${PORT}/`);
