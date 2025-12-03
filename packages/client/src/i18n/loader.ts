import type { TranslationData } from '@lmgroktfy/shared';

/**
 * Translation loading and caching.
 */

export async function loadTranslations(
  language: string,
  cache: Record<string, TranslationData>
): Promise<TranslationData> {
  if (cache[language]) {
    return cache[language];
  }

  try {
    const url = new URL(`/locales/${language}.json`, window.location.origin);
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const translations = await response.json();
    cache[language] = translations;
    return translations;
  } catch (error) {
    console.error(`[I18n] Could not load translations for ${language}:`, error);
    throw error;
  }
}
