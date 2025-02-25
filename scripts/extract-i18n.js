/**
 * @fileoverview Extract translatable strings from HTML and JS files
 * 
 * This script scans the project for translatable strings in HTML and JavaScript files.
 * It extracts strings from data-i18n attributes in HTML and i18n.t() calls in JS files.
 * The extracted strings are merged with existing translations and written to the source
 * language JSON file.
 * 
 * @module scripts/extract-i18n
 * @requires fs
 * @requires path
 * @requires url
 * @requires glob
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pkg from 'glob';
const { glob } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const sourceLanguage = 'en';
const outputFile = path.join(__dirname, '..', 'locales', `${sourceLanguage}.json`);
const htmlFiles = glob.sync('**/*.html', { ignore: 'node_modules/**' });
const jsFiles = glob.sync('js/**/*.js', { ignore: 'node_modules/**' });

/**
 * Load existing translations from the output file if available
 * 
 * @returns {Object} The existing translations or an empty object if none exist
 */
let existingTranslations = {};
try {
  existingTranslations = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  console.log(`Loaded existing translations from ${outputFile}`);
} catch (error) {
  console.log('No existing translations found, creating new file');
}

/**
 * Extract keys from HTML files by searching for data-i18n attributes
 * 
 * @type {Set<string>} Set of unique translation keys found in HTML files
 */
const htmlKeys = new Set();
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const dataI18nRegex = /data-i18n="([^"]+)"/g;
  let match;
  while ((match = dataI18nRegex.exec(content)) !== null) {
    htmlKeys.add(match[1]);
  }
});

/**
 * Extract keys from JS files by searching for i18n.t() function calls
 * 
 * @type {Set<string>} Set of unique translation keys found in JS files
 */
const jsKeys = new Set();
const i18nPattern = /i18n\.t\(['"]([^'"]+)['"]\)/g;
jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = i18nPattern.exec(content)) !== null) {
    jsKeys.add(match[1]);
  }
});

// Combine all keys
const allKeys = new Set([...htmlKeys, ...jsKeys]);
console.log(`Found ${allKeys.size} translatable strings`);

/**
 * Create a nested object structure from a dot-notation key
 * 
 * @param {Object} obj - The object to modify
 * @param {string} key - The dot-notation key (e.g., 'main.title')
 * @param {string} value - The value to set at the key path
 * @returns {Object} The modified object
 * @example
 * // Returns { main: { title: 'Hello' } }
 * createNestedObject({}, 'main.title', 'Hello')
 */
function createNestedObject(obj, key, value) {
  const keys = key.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  // Only set value if it doesn't exist or is empty
  const lastKey = keys[keys.length - 1];
  if (!current[lastKey] || current[lastKey] === '') {
    current[lastKey] = value || key.split('.').pop();
  }
  
  return obj;
}

// Build translation object
let translations = JSON.parse(JSON.stringify(existingTranslations));
allKeys.forEach(key => {
  // Get existing translation or use empty string
  const existingValue = key.split('.').reduce((obj, k) => obj && obj[k], existingTranslations) || '';
  translations = createNestedObject(translations, key, existingValue);
});

// Write to file
fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2));
console.log(`Updated translations written to ${outputFile}`);

/**
 * Count and report missing translations
 * A translation is considered missing if it doesn't exist or equals its key's last segment
 */
const missingCount = [...allKeys].filter(key => {
  const value = key.split('.').reduce((obj, k) => obj && obj[k], translations);
  return !value || value === key.split('.').pop();
}).length;

console.log(`Missing translations: ${missingCount}/${allKeys.size}`); 