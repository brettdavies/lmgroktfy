import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@lmgroktfy/shared';

/**
 * URL <-> question helpers. The server owns i18n routing, so these mirror its
 * locale rules: the default locale is unprefixed, other locales carry a leading
 * `/xx` segment, and a deep-link path may sit under a locale (`/es/what+is+grok`).
 */

function isSupportedLocale(value: string): boolean {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function stripLeadingLocale(segments: string[]): string[] {
  return segments.length > 0 && isSupportedLocale(segments[0]) ? segments.slice(1) : segments;
}

/**
 * Decodes the question from a path, tolerating both `+` and `%20` word
 * separators and ignoring any leading locale segment. Returns `''` for a home
 * or locale-root path.
 */
export function decodeQuestionFromPath(pathname: string = window.location.pathname): string {
  const trimmed = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed) return '';

  const rest = stripLeadingLocale(trimmed.split('/')).join('/');
  if (!rest) return '';

  const spaced = rest.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced).trim();
  } catch {
    return spaced.trim();
  }
}

export function hasUrlQuestion(): boolean {
  return decodeQuestionFromPath() !== '';
}

/** Maps a pathname onto `locale` (default locale unprefixed), preserving any
 *  trailing question segment as-is. */
export function localizedPath(locale: string, pathname: string = window.location.pathname): string {
  const rest = stripLeadingLocale(pathname.split('/').filter(Boolean)).join('/');
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return rest ? `${prefix}/${rest}` : `${prefix}/`;
}

/**
 * Client mirror of the server `?lang=` shim. Prerendered roots (`/`, `/es/`) are
 * served from the asset layer without invoking the Worker, so the server
 * redirect never fires there; this redirects `/?lang=es` -> `/es/` in the
 * browser. Returns `true` when it navigates, so the caller can skip further init.
 */
export function applyLangRedirect(): boolean {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get('lang');
  if (!requested || !isSupportedLocale(requested)) return false;

  const path = localizedPath(requested, url.pathname);
  const remaining = new URLSearchParams(url.search);
  remaining.delete('lang');
  const query = remaining.toString();
  const target = query ? `${path}?${query}` : path;
  const current = query ? `${url.pathname}?${query}` : url.pathname;
  if (target === current) return false;

  window.location.replace(target);
  return true;
}
