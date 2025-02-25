/**
 * Language detection module
 * Detects user's preferred language based on browser settings and saved preferences
 */

/**
 * Detects the user's preferred language
 * Checks in order: localStorage, navigator.languages, navigator.language
 * @returns {string} Two-letter language code (e.g., 'en', 'es')
 */
export const detectUserLanguage = () => {
  // Check localStorage first (returning user)
  const savedLanguage = localStorage.getItem('userLanguage');
  if (savedLanguage) return savedLanguage;
  
  // Check navigator.languages (browser setting)
  if (navigator.languages && navigator.languages.length) {
    // Get first two chars of language code (e.g., "en-US" -> "en")
    const browserLang = navigator.languages[0].substring(0, 2);
    return browserLang;
  }
  
  // Fallback to navigator.language
  if (navigator.language) {
    return navigator.language.substring(0, 2);
  }
  
  // Default fallback
  return 'en';
};

/**
 * Determines if the detected language is supported, otherwise falls back to default
 * @param {string} detectedLanguage - The detected language code
 * @param {string[]} supportedLanguages - Array of supported language codes
 * @returns {string} A supported language code
 */
export const getSupportedLanguage = (detectedLanguage, supportedLanguages) => {
  // If detected language is supported, use it
  if (supportedLanguages.includes(detectedLanguage)) {
    return detectedLanguage;
  }
  
  // Otherwise default to English
  return 'en';
}; 