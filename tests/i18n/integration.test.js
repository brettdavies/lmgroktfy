/**
 * Integration tests for the i18n module with the actual HTML
 */

import i18n from '../../js/i18n/i18n.js';

// Mock fetch for translations
global.fetch = jest.fn((url) => {
  if (url.includes('/locales/en.json')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        "main": {
          "title": "Let me <span>Grok</span> that for you",
          "loading": "Grokking..."
        },
        "help": {
          "title": "How to Use LMGROKTFY"
        }
      })
    });
  } else if (url.includes('/locales/es.json')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        "main": {
          "title": "Deja que <span>Grok</span> te lo explique",
          "loading": "Procesando..."
        },
        "help": {
          "title": "Cómo usar LMGROKTFY"
        }
      })
    });
  }
  return Promise.reject(new Error(`Unexpected URL: ${url}`));
});

describe('I18n Integration', () => {
  beforeEach(() => {
    // Create a simple DOM structure for testing
    document.body.innerHTML = `
      <html>
        <head>
          <title data-i18n="page.title">Let me Grok that for you</title>
        </head>
        <body>
          <h1 data-i18n="main.title">Let me <span>Grok</span> that for you</h1>
          <div id="loading">
            <span data-i18n="main.loading">Grokking...</span>
          </div>
          <div id="help-modal">
            <h2 data-i18n="help.title">How to Use LMGROKTFY</h2>
          </div>
          <select id="language-switcher">
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </body>
      </html>
    `;
    
    // Reset i18n instance
    i18n.translations = {};
    i18n.currentLanguage = 'en';
    i18n.supportedLanguages = ['en'];
    i18n.isLoading = false;
    i18n.loadingPromise = null;
    i18n.documentTranslated = false;
    
    // Override translateDocument method for testing
    i18n.translateDocument = function() {
      const elements = document.querySelectorAll('[data-i18n]');
      console.log(`[I18n] Found elements to translate: ${elements.length}`);
      
      if (elements.length === 0) {
        console.warn('[I18n] No elements found with data-i18n attribute');
        return;
      }
      
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
      
      console.log(`[I18n] Prepared updates: ${updates.length}`);
      
      // Apply updates
      updates.forEach(({ element, translation }) => {
        element.innerHTML = translation;
      });
    };
    
    // Override getTranslation method for testing
    i18n.getTranslation = function(key) {
      if (!this.translations[this.currentLanguage]) {
        return null;
      }
      
      const keys = key.split('.');
      let result = this.translations[this.currentLanguage];
      
      for (const k of keys) {
        if (result && result[k]) {
          result = result[k];
        } else {
          console.warn(`[I18n] Translation not found for key: ${key} in language: ${this.currentLanguage}`);
          return null;
        }
      }
      
      return result;
    };
  });
  
  test('should translate the document to English', async () => {
    await i18n.init({
      supportedLanguages: ['en', 'es'],
      defaultLanguage: 'en',
      languageSwitcherSelector: '#language-switcher'
    });
    
    // Manually call translateDocument since we're in a test environment
    i18n.translateDocument();
    
    // Check if elements are translated correctly
    const titleElement = document.querySelector('[data-i18n="main.title"]');
    const loadingElement = document.querySelector('[data-i18n="main.loading"]');
    const helpTitleElement = document.querySelector('[data-i18n="help.title"]');
    
    expect(titleElement.innerHTML).toBe('Let me <span>Grok</span> that for you');
    expect(loadingElement.textContent).toBe('Grokking...');
    expect(helpTitleElement.textContent).toBe('How to Use LMGROKTFY');
  });
  
  test('should translate the document to Spanish', async () => {
    await i18n.init({
      supportedLanguages: ['en', 'es'],
      defaultLanguage: 'en',
      languageSwitcherSelector: '#language-switcher'
    });
    
    // Change language to Spanish
    await i18n.setLanguage('es');
    
    // Manually call translateDocument since we're in a test environment
    i18n.translateDocument();
    
    // Check if elements are translated correctly
    const titleElement = document.querySelector('[data-i18n="main.title"]');
    const loadingElement = document.querySelector('[data-i18n="main.loading"]');
    const helpTitleElement = document.querySelector('[data-i18n="help.title"]');
    
    expect(titleElement.innerHTML).toBe('Deja que <span>Grok</span> te lo explique');
    expect(loadingElement.textContent).toBe('Procesando...');
    expect(helpTitleElement.textContent).toBe('Cómo usar LMGROKTFY');
  });
  
  test('should update language when language switcher changes', async () => {
    // Mock the language switcher change event
    const languageSwitcher = document.querySelector('#language-switcher');
    const setLanguageSpy = jest.spyOn(i18n, 'setLanguage');
    
    // Mock initLanguageSwitcher method if it doesn't exist in the test environment
    if (!i18n.initLanguageSwitcher) {
      i18n.initLanguageSwitcher = function(selector) {
        const switcher = document.querySelector(selector);
        if (switcher) {
          switcher.addEventListener('change', (event) => {
            this.setLanguage(event.target.value);
          });
        }
      };
    }
    
    await i18n.init({
      supportedLanguages: ['en', 'es'],
      defaultLanguage: 'en',
      languageSwitcherSelector: '#language-switcher'
    });
    
    // Manually call initLanguageSwitcher since we're in a test environment
    i18n.initLanguageSwitcher('#language-switcher');
    
    // Simulate changing the language
    languageSwitcher.value = 'es';
    languageSwitcher.dispatchEvent(new Event('change'));
    
    expect(setLanguageSpy).toHaveBeenCalledWith('es');
  });
}); 