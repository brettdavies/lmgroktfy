/**
 * Main JavaScript file
 * Initializes the localization system and other functionality
 */

import i18n from './i18n/i18n.js';

/**
 * Initialize the application
 */
function initApp() {
  // Add any other initialization code here
  console.log('App initialized');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize i18n with configuration
  await i18n.init({
    supportedLanguages: ['en', 'es', 'fr', 'de', 'ja'],
    defaultLanguage: 'en',
    languageSwitcherSelector: '#language-switcher'
  });
  
  // Continue with other initialization
  initApp();
}); 