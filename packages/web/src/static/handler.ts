import type { Env } from '../types';

/**
 * Handles static asset requests with SPA routing
 */
export async function handleStaticRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  let path = url.pathname;

  // SPA routing: non-file paths serve index.html
  // Files have extensions like .js, .css, .png, etc.
  const hasExtension = path.includes('.') && !path.endsWith('/');

  if (!hasExtension && path !== '/') {
    path = '/index.html';
  }

  try {
    // Try to fetch the asset
    const assetUrl = new URL(path, request.url);
    const assetRequest = new Request(assetUrl.toString(), request);

    const response = await env.ASSETS.fetch(assetRequest);

    if (response.ok) {
      return response;
    }

    // If asset not found and it's not already index.html, try index.html (SPA fallback)
    if (path !== '/index.html' && !hasExtension) {
      const fallbackRequest = new Request(new URL('/index.html', request.url).toString(), request);
      return env.ASSETS.fetch(fallbackRequest);
    }

    return response;
  } catch {
    // If all else fails, try to serve index.html
    try {
      const fallbackRequest = new Request(new URL('/index.html', request.url).toString(), request);
      return env.ASSETS.fetch(fallbackRequest);
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }
}
