import { ALLOWED_DOMAINS, HEADERS, HTTP_STATUS } from '@lmgroktfy/shared';

interface SecurityCheckResult {
  allowed: boolean;
  response?: Response;
}

/**
 * Validates the request origin/referer against allowed domains
 */
export function validateOrigin(request: Request): SecurityCheckResult {
  const referer = request.headers.get('Referer');
  const origin = request.headers.get('Origin');

  // In development, allow all origins
  const cf = request.cf as { zoneName?: string } | undefined;
  if (!cf?.zoneName) {
    return { allowed: true };
  }

  // Check Cloudflare zone
  if (!ALLOWED_DOMAINS.includes(cf.zoneName as (typeof ALLOWED_DOMAINS)[number])) {
    return {
      allowed: false,
      response: createForbiddenResponse('Access denied: Invalid zone'),
    };
  }

  // Optionally validate referer for additional security
  if (referer) {
    try {
      const refererDomain = new URL(referer).hostname;
      const isAllowed = ALLOWED_DOMAINS.some(
        (domain) => refererDomain === domain || refererDomain.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        return {
          allowed: false,
          response: createForbiddenResponse('Access denied: Invalid referer'),
        };
      }
    } catch {
      // Invalid referer URL, deny access
      return {
        allowed: false,
        response: createForbiddenResponse('Access denied: Invalid referer format'),
      };
    }
  }

  // Check origin header if present
  if (origin) {
    try {
      const originDomain = new URL(origin).hostname;
      const isAllowed = ALLOWED_DOMAINS.some(
        (domain) => originDomain === domain || originDomain.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        return {
          allowed: false,
          response: createForbiddenResponse('Access denied: Invalid origin'),
        };
      }
    } catch {
      return {
        allowed: false,
        response: createForbiddenResponse('Access denied: Invalid origin format'),
      };
    }
  }

  return { allowed: true };
}

function createForbiddenResponse(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: HTTP_STATUS.FORBIDDEN,
    headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
  });
}
