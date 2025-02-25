/**
 * Core localization module
 * Handles loading translations and applying them to the DOM
 */

import { detectUserLanguage, getSupportedLanguage } from './language-detector.js';

/**
 * I18n class for handling localization
 * Singleton pattern - only one instance should exist
 */
class I18n {
  /**
   * Initialize the I18n instance
   */
  constructor() {
    this.translations = {};
    this.currentLanguage = 'en';
    this.supportedLanguages = ['en']; // Will be populated from config
    this.isLoading = false;
    this.loadingPromise = null;
    this.documentTranslated = false;
    this.translationObserver = null;
  }
  
  /**
   * Initialize the localization system
   * @param {Object} config - Configuration options
   * @param {string[]} config.supportedLanguages - Array of supported language codes
   * @param {string} config.defaultLanguage - Default language code
   * @param {string} config.languageSwitcherSelector - CSS selector for language switcher element
   * @returns {I18n} The I18n instance
   */
  async init(config = {}) {
    this.supportedLanguages = config.supportedLanguages || ['en'];
    this.defaultLanguage = config.defaultLanguage || 'en';
    
    // Detect user language and get supported version
    const detectedLanguage = detectUserLanguage();
    const language = getSupportedLanguage(detectedLanguage, this.supportedLanguages);
    
    // Set language (will load translations)
    await this.setLanguage(language);
    
    // Add language switcher event listeners if provided
    if (config.languageSwitcherSelector) {
      this.initLanguageSwitcher(config.languageSwitcherSelector);
    }
    
    // Initialize lazy loading for off-screen elements
    this.initIntersectionObserver();
    
    return this;
  }
  
  /**
   * Set the active language and translate the document
   * @param {string} language - Language code to set
   */
  async setLanguage(language) {
    if (this.isLoading) {
      // Wait for current loading to finish
      await this.loadingPromise;
    }
    
    if (language === this.currentLanguage && this.documentTranslated) {
      return; // Already using this language
    }
    
    // Set loading state
    this.isLoading = true;
    
    // Create a promise for loading
    this.loadingPromise = this.loadTranslations(language);
    
    try {
      await this.loadingPromise;
      this.currentLanguage = language;
      
      // Save to localStorage for returning users
      localStorage.setItem('userLanguage', language);
      
      // Update HTML lang attribute
      document.documentElement.lang = language;
      
      // Translate the document
      this.translateDocument();
      this.documentTranslated = true;
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language } 
      }));
    } catch (error) {
      console.error(`Failed to load translations for ${language}:`, error);
      
      // If not English, try to fall back to English
      if (language !== 'en') {
        await this.setLanguage('en');
      }
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Load translations for a specific language
   * @param {string} language - Language code to load
   */
  async loadTranslations(language) {
    // Skip loading if we already have this language
    if (this.translations[language]) {
      return;
    }
    
    try {
      const response = await fetch(`/locales/${language}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.translations[language] = await response.json();
    } catch (error) {
      console.error(`Could not load translations for ${language}:`, error);
      throw error;
    }
  }
  
  /**
   * Translate all elements with data-i18n attribute in the document
   * Uses requestAnimationFrame for performance optimization
   */
  translateDocument() {
    // Get all elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');
    
    // First pass: collect all elements and their translations
    const updates = [];
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.getTranslation(key);
      
      if (translation) {
        updates.push({ element, key, translation });
      }
    });
    
    // Second pass: apply all translations in a single batch
    requestAnimationFrame(() => {
      updates.forEach(({ element, key, translation }) => {
        if (key.endsWith('-html')) {
          element.innerHTML = translation;
        } else {
          element.textContent = translation;
        }
      });
    });
  }
  
  /**
   * Translate a single element
   * @param {HTMLElement} element - Element to translate
   * @param {string} key - Translation key
   */
  translateElement(element, key) {
    const translation = this.getTranslation(key);
    
    if (!translation) {
      // Log missing translation in development mode
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Missing translation for key: ${key} in language: ${this.currentLanguage}`);
      }
      return;
    }
    
    // Check if we need to handle HTML content
    if (key.endsWith('-html')) {
      element.innerHTML = translation;
    } else {
      element.textContent = translation;
    }
  }
  
  /**
   * Get a translation by key
   * @param {string} key - Translation key
   * @returns {string|null} Translation or null if not found
   */
  getTranslation(key) {
    const translations = this.translations[this.currentLanguage];
    
    if (!translations) {
      return null;
    }
    
    return translations[key] || null;
  }
  
  /**
   * Initialize the language switcher
   * @param {string} selector - CSS selector for language switcher element
   */
  initLanguageSwitcher(selector) {
    const switcher = document.querySelector(selector);
    
    if (!switcher) return;
    
    // Set initial value
    if (switcher.tagName === 'SELECT') {
      switcher.value = this.currentLanguage;
    }
    
    // Add event listener
    switcher.addEventListener('change', (event) => {
      this.setLanguage(event.target.value);
    });
  }
  
  /**
   * Initialize intersection observer for lazy loading translations
   * Only translates elements when they become visible in the viewport
   */
  initIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    
    this.translationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const key = element.getAttribute('data-i18n-lazy');
          this.translateElement(element, key);
          this.translationObserver.unobserve(element);
        }
      });
    });
    
    // Observe all elements with data-i18n-lazy attribute
    document.querySelectorAll('[data-i18n-lazy]').forEach(element => {
      this.translationObserver.observe(element);
    });
  }
}

// Create singleton instance
const i18n = new I18n();
export default i18n; 