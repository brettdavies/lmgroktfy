import { RTL_LOCALES } from '@lmgroktfy/shared';

/**
 * RTL/LTR directionality handling.
 */

export function isRTLLanguage(language: string): boolean {
  return RTL_LOCALES.includes(language as (typeof RTL_LOCALES)[number]);
}

export function applyDirectionality(language: string): void {
  document.documentElement.setAttribute('lang', language);

  if (isRTLLanguage(language)) {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
  }
}
