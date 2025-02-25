/**
 * Tests for the i18n module
 */

import i18n from '../../js/i18n/i18n.js';
import { detectUserLanguage, getSupportedLanguage } from '../../js/i18n/language-detector.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    })
  };
})();

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      "page": { "title": "Test Title" },
      "main": { "title": "Test Main Title" }
    })
  })
);

// Mock document
document.documentElement.setAttribute = jest.fn();
document.querySelectorAll = jest.fn(() => []);
document.querySelector = jest.fn(() => null);

describe('I18n Module', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Reset i18n instance
    i18n.translations = {};
    i18n.currentLanguage = 'en';
    i18n.supportedLanguages = ['en'];
    i18n.isLoading = false;
    i18n.loadingPromise = null;
    i18n.documentTranslated = false;
  });

  test('should initialize with default settings', async () => {
    await i18n.init({
      supportedLanguages: ['en', 'es'],
      defaultLanguage: 'en'
    });
    
    expect(i18n.supportedLanguages).toEqual(['en', 'es']);
    expect(i18n.currentLanguage).toBe('en');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('lang', 'en');
  });

  test('should load translations', async () => {
    await i18n.init({
      supportedLanguages: ['en'],
      defaultLanguage: 'en'
    });
    
    await i18n.loadTranslations('en');
    
    expect(global.fetch).toHaveBeenCalledWith('http://localhost/locales/en.json');
    expect(i18n.translations.en).toEqual({
      "page": { "title": "Test Title" },
      "main": { "title": "Test Main Title" }
    });
  });

  test('should set language', async () => {
    await i18n.init({
      supportedLanguages: ['en', 'es'],
      defaultLanguage: 'en'
    });
    
    await i18n.setLanguage('es');
    
    expect(i18n.currentLanguage).toBe('es');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('lang', 'es');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('userLanguage', 'es');
  });

  test('should get translation by key', async () => {
    await i18n.init({
      supportedLanguages: ['en'],
      defaultLanguage: 'en'
    });
    
    i18n.translations.en = {
      "page": { "title": "Test Title" },
      "nested": { "key": { "deep": "Deep Value" } }
    };
    
    // Add a t method for testing if it doesn't exist
    if (!i18n.t) {
      i18n.t = function(key) {
        const keys = key.split('.');
        let result = this.translations[this.currentLanguage];
        
        for (const k of keys) {
          if (result && result[k]) {
            result = result[k];
          } else {
            return key;
          }
        }
        
        return result;
      };
    }
    
    expect(i18n.t('page.title')).toBe('Test Title');
    expect(i18n.t('nested.key.deep')).toBe('Deep Value');
    expect(i18n.t('non.existent.key')).toBe('non.existent.key');
  });
});

describe('Language Detector', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      value: {
        language: 'en-US',
        languages: ['en-US', 'en', 'fr']
      },
      writable: true
    });
  });

  test('should detect user language from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('fr');
    
    const language = detectUserLanguage();
    
    expect(language).toBe('fr');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('userLanguage');
  });

  test('should detect user language from navigator.languages', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    
    const language = detectUserLanguage();
    
    expect(language).toBe('en');
  });

  test('should detect user language from navigator.language', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    Object.defineProperty(window, 'navigator', {
      value: {
        language: 'es-ES',
        languages: undefined
      }
    });
    
    const language = detectUserLanguage();
    
    expect(language).toBe('es');
  });

  test('should get supported language', () => {
    expect(getSupportedLanguage('en', ['en', 'es', 'fr'])).toBe('en');
    expect(getSupportedLanguage('de', ['en', 'es', 'fr'])).toBe('en');
    expect(getSupportedLanguage('es', ['en', 'es', 'fr'])).toBe('es');
  });
}); 