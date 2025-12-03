import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@lmgroktfy/shared';
import type { TranslationData } from '@lmgroktfy/shared';
import { detectUserLanguage, getSupportedLanguage } from './detector';
import { applyDirectionality } from './directionality';
import { loadTranslations } from './loader';
import { initLanguageSwitcher } from './switcher';
import {
  createLazyObserver,
  getTranslation,
  translateDocument,
  translateElement,
} from './translator';

/**
 * I18n - Core localization module facade.
 */

interface I18nConfig {
  supportedLanguages?: readonly string[];
  defaultLanguage?: string;
  languageSwitcherSelector?: string;
}

class I18n {
  translations: Record<string, TranslationData> = {};
  currentLanguage = DEFAULT_LOCALE;
  supportedLanguages: readonly string[] = SUPPORTED_LOCALES;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;
  private documentTranslated = false;

  async init(config: I18nConfig = {}): Promise<I18n> {
    this.supportedLanguages = config.supportedLanguages ?? SUPPORTED_LOCALES;

    const detectedLanguage = detectUserLanguage();
    const language = getSupportedLanguage(detectedLanguage, this.supportedLanguages);

    await this.setLanguage(language);

    if (config.languageSwitcherSelector) {
      initLanguageSwitcher(config.languageSwitcherSelector, this.currentLanguage, (lang) =>
        this.setLanguage(lang)
      );
    }

    createLazyObserver((el, key) => this.translateElement(el, key));

    return this;
  }

  async setLanguage(language: string): Promise<void> {
    if (this.isLoading && this.loadingPromise) {
      await this.loadingPromise;
    }

    if (language === this.currentLanguage && this.documentTranslated) {
      return;
    }

    this.isLoading = true;
    this.loadingPromise = this.doSetLanguage(language);

    try {
      await this.loadingPromise;
    } finally {
      this.isLoading = false;
    }
  }

  private async doSetLanguage(language: string): Promise<void> {
    try {
      await loadTranslations(language, this.translations);
      this.currentLanguage = language;

      localStorage.setItem('userLanguage', language);
      applyDirectionality(language);

      this.translateDocument();
      this.documentTranslated = true;

      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
    } catch (error) {
      console.error(`[I18n] Failed to load translations for ${language}:`, error);
      if (language !== DEFAULT_LOCALE) {
        await this.setLanguage(DEFAULT_LOCALE);
      }
    }
  }

  translateDocument(): void {
    translateDocument(this.translations[this.currentLanguage]);
  }

  translateElement(element: HTMLElement, key: string): void {
    translateElement(element, key, this.translations[this.currentLanguage]);
  }

  t(key: string): string | TranslationData | string[] {
    return getTranslation(key, this.translations[this.currentLanguage]);
  }

  getTranslation(key: string): string | TranslationData | string[] {
    return getTranslation(key, this.translations[this.currentLanguage]);
  }
}

export const i18n = new I18n();

export { detectUserLanguage, getSupportedLanguage } from './detector';
