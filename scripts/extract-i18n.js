/**
 * Extract translatable strings from HTML and JS files
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const sourceLanguage = 'en';
const outputFile = path.join(__dirname, '..', 'locales', `${sourceLanguage}.json`);
const htmlFiles = glob.sync('**/*.html', { ignore: 'node_modules/**' });
const jsFiles = glob.sync('js/**/*.js', { ignore: 'node_modules/**' });

// Load existing translations if available
let existingTranslations = {};
try {
  existingTranslations = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  console.log(`Loaded existing translations from ${outputFile}`);
} catch (error) {
  console.log('No existing translations found, creating new file');
}

// Extract keys from HTML files (data-i18n attributes)
const htmlKeys = new Set();
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const dataI18nRegex = /data-i18n="([^"]+)"/g;
  let match;
  while ((match = dataI18nRegex.exec(content)) !== null) {
    htmlKeys.add(match[1]);
  }
});

// Extract keys from JS files (i18n.t() calls)
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

// Create nested structure from dot notation
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

// Output missing translations
const missingCount = [...allKeys].filter(key => {
  const value = key.split('.').reduce((obj, k) => obj && obj[k], translations);
  return !value || value === key.split('.').pop();
}).length;

console.log(`Missing translations: ${missingCount}/${allKeys.size}`); 