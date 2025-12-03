/**
 * Default locale for the application
 */
export const DEFAULT_LOCALE = 'en';

/**
 * Supported locales
 */
export const SUPPORTED_LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'ja'] as const;

/**
 * RTL (right-to-left) locales
 */
export const RTL_LOCALES = ['ar'] as const;

/**
 * Locale display names
 */
export const LOCALE_NAMES: Record<string, string> = {
  ar: 'العربية',
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
} as const;
