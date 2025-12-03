import type { TranslationData } from '@lmgroktfy/shared';

/**
 * DOM translation logic.
 */

export function getTranslation(
  key: string,
  translations: TranslationData | undefined
): string | TranslationData | string[] {
  if (!translations) {
    return key;
  }

  const parts = key.split('.');
  let result: TranslationData | string | string[] = translations;

  for (const part of parts) {
    if (result && typeof result === 'object' && !Array.isArray(result) && part in result) {
      result = result[part];
    } else {
      return key;
    }
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return key;
  }

  return result;
}

export function translateElement(
  element: HTMLElement,
  key: string,
  translations: TranslationData | undefined
): void {
  const translation = getTranslation(key, translations);

  if (!translation || typeof translation !== 'string') {
    console.warn(`[I18n] Missing translation for key: ${key}`);
    return;
  }

  applyTranslation(element, key, translation);
}

export function translateDocument(translations: TranslationData | undefined): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-i18n]');

  if (elements.length === 0) {
    return;
  }

  const updates: Array<{
    element: HTMLElement;
    key: string;
    translation: string;
  }> = [];

  for (const element of elements) {
    const key = element.getAttribute('data-i18n');
    if (!key) continue;

    const translation = getTranslation(key, translations);
    if (translation && typeof translation === 'string') {
      updates.push({ element, key, translation });
    }
  }

  if (updates.length === 0) return;

  requestAnimationFrame(() => {
    for (const { element, key, translation } of updates) {
      applyTranslation(element, key, translation);
    }
  });
}

function applyTranslation(element: HTMLElement, key: string, translation: string): void {
  const containsHtml = /<[a-z][\s\S]*>/i.test(translation) || key.endsWith('-html');
  if (containsHtml) {
    element.innerHTML = translation;
  } else {
    element.textContent = translation;
  }
}

export function createLazyObserver(
  translateFn: (element: HTMLElement, key: string) => void
): IntersectionObserver | null {
  if (!('IntersectionObserver' in window)) return null;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        const key = element.getAttribute('data-i18n-lazy');
        if (key) {
          translateFn(element, key);
          observer.unobserve(element);
        }
      }
    }
  });

  for (const element of document.querySelectorAll('[data-i18n-lazy]')) {
    observer.observe(element);
  }

  return observer;
}
