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
    console.log('[I18n] Initializing with config:', config);
    this.supportedLanguages = config.supportedLanguages || ['en'];
    this.defaultLanguage = config.defaultLanguage || 'en';
    
    // Detect user language and get supported version
    const detectedLanguage = detectUserLanguage();
    console.log('[I18n] Detected user language:', detectedLanguage);
    const language = getSupportedLanguage(detectedLanguage, this.supportedLanguages);
    console.log('[I18n] Using supported language:', language);
    
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
    console.log('[I18n] Setting language to:', language);
    if (this.isLoading) {
      // Wait for current loading to finish
      console.log('[I18n] Waiting for current loading to finish');
      await this.loadingPromise;
    }
    
    if (language === this.currentLanguage && this.documentTranslated) {
      console.log('[I18n] Already using language:', language);
      return; // Already using this language
    }
    
    // Set loading state
    this.isLoading = true;
    
    // Create a promise for loading
    this.loadingPromise = this.loadTranslations(language);
    
    try {
      await this.loadingPromise;
      this.currentLanguage = language;
      console.log('[I18n] Language set to:', language);
      
      // Save to localStorage for returning users
      localStorage.setItem('userLanguage', language);
      
      // Update HTML lang attribute
      document.documentElement.setAttribute('lang', language);
      
      // Translate the document
      this.translateDocument();
      this.documentTranslated = true;
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language } 
      }));
    } catch (error) {
      console.error(`[I18n] Failed to load translations for ${language}:`, error);
      
      // If not English, try to fall back to English
      if (language !== 'en') {
        console.log('[I18n] Falling back to English');
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
    console.log('[I18n] Loading translations for:', language);
    // Skip loading if we already have this language
    if (this.translations[language]) {
      console.log('[I18n] Already have translations for:', language);
      return;
    }
    
    try {
      // Use absolute path to ensure correct loading
      const url = new URL(`/locales/${language}.json`, window.location.origin);
      console.log(`[I18n] Fetching translations from: ${url.toString()}`);
      
      const response = await fetch(url.toString());
      console.log(`[I18n] Fetch response for ${language}:`, response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.translations[language] = await response.json();
      console.log(`[I18n] Loaded translations for ${language}:`, Object.keys(this.translations[language]).length, 'top-level keys');
      
      // Debug: Log the first few translations to verify content
      const firstKeys = Object.keys(this.translations[language]).slice(0, 3);
      console.log(`[I18n] Sample translations for ${language}:`, 
        firstKeys.map(key => `${key}: ${JSON.stringify(this.translations[language][key]).substring(0, 50)}...`));
    } catch (error) {
      console.error(`[I18n] Could not load translations for ${language}:`, error);
      throw error;
    }
  }
  
  /**
   * Translate all elements with data-i18n attribute in the document
   * Uses requestAnimationFrame for performance optimization
   */
  translateDocument() {
    console.log('[I18n] Translating document');
    // Get all elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');
    console.log('[I18n] Found elements to translate:', elements.length);
    
    if (elements.length === 0) {
      console.warn('[I18n] No elements found with data-i18n attribute');
      return;
    }
    
    // First pass: collect all elements and their translations
    const updates = [];
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.getTranslation(key);
      
      if (translation) {
        updates.push({ element, key, translation });
      } else {
        console.warn(`[I18n] No translation found for key: ${key}`);
      }
    });
    
    console.log('[I18n] Prepared updates:', updates.length);
    
    if (updates.length === 0) {
      console.warn('[I18n] No translations found for any elements');
      return;
    }
    
    // Second pass: apply all translations in a single batch
    requestAnimationFrame(() => {
      updates.forEach(({ element, key, translation }) => {
        const originalContent = element.innerHTML;
        
        // Check if the translation contains HTML tags or if the key ends with -html
        const containsHtml = /<[a-z][\s\S]*>/i.test(translation) || key.endsWith('-html');
        
        if (containsHtml) {
          element.innerHTML = translation;
        } else {
          element.textContent = translation;  // Use textContent for plain text content
        }
        
        console.log(`[I18n] Translated element with key ${key}: "${originalContent}" -> "${translation}"`);
      });
      console.log('[I18n] Applied all translations');
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
      console.warn(`[I18n] Missing translation for key: ${key} in language: ${this.currentLanguage}`);
      return;
    }
    
    // Check if the translation contains HTML tags or if the key ends with -html
    const containsHtml = /<[a-z][\s\S]*>/i.test(translation) || key.endsWith('-html');
    
    if (containsHtml) {
      element.innerHTML = translation;
    } else {
      element.textContent = translation;  // Use textContent for plain text content
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
      console.warn(`[I18n] No translations loaded for language: ${this.currentLanguage}`);
      return null;
    }
    
    // Handle nested keys (e.g., 'main.title')
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        console.warn(`[I18n] Translation not found for key: ${key} in language: ${this.currentLanguage}`);
        return null;
      }
    }
    
    return result;
  }
  
  /**
   * Initialize the language switcher
   * @param {string} selector - CSS selector for language switcher element
   */
  initLanguageSwitcher(selector) {
    const switcher = document.querySelector(selector);
    
    if (!switcher) {
      console.warn('[I18n] Language switcher not found:', selector);
      return;
    }
    
    // Set initial value
    if (switcher.tagName === 'SELECT') {
      console.log('[I18n] Setting language switcher value to:', this.currentLanguage);
      
      // Make sure the option exists before setting it
      const optionExists = Array.from(switcher.options).some(option => option.value === this.currentLanguage);
      if (optionExists) {
        switcher.value = this.currentLanguage;
      } else {
        console.warn(`[I18n] Language option for "${this.currentLanguage}" not found in switcher`);
      }
      
      // Verify the value was set correctly
      console.log('[I18n] Language switcher value after setting:', switcher.value);
    }
    
    // Add event listener
    switcher.addEventListener('change', (event) => {
      console.log('[I18n] Language switcher changed to:', event.target.value);
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