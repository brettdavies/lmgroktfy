import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@lmgroktfy/shared';

/**
 * Language detection utilities.
 */

export function detectUserLanguage(): string {
  // Check URL parameter - if present, save to localStorage so it persists and syncs with DDL
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && SUPPORTED_LOCALES.includes(urlLang as (typeof SUPPORTED_LOCALES)[number])) {
    localStorage.setItem('userLanguage', urlLang);
  }

  // Check localStorage (now includes URL param if it was set above)
  const savedLanguage = localStorage.getItem('userLanguage');
  if (savedLanguage) {
    return savedLanguage;
  }

  // Check navigator language
  if (navigator.language) {
    return navigator.language.split('-')[0];
  }

  // Check navigator languages array
  if (navigator.languages && navigator.languages.length > 0) {
    return navigator.languages[0].split('-')[0];
  }

  return DEFAULT_LOCALE;
}

export function getSupportedLanguage(
  detected: string,
  supported: readonly string[] = SUPPORTED_LOCALES
): string {
  const normalized = detected.toLowerCase().split('-')[0];

  if (supported.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_LOCALE;
}
