/**
 * Synchronize translation files to ensure consistent structure
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const sourceLanguage = 'en';
const sourceFile = path.join(__dirname, '..', 'locales', `${sourceLanguage}.json`);
const localeFiles = glob.sync('locales/*.json');

// Load source translations
const sourceTranslations = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// Sync target structure with source
function syncStructure(source, target) {
  const result = {};
  
  // Add all keys from source, keeping target values where they exist
  Object.keys(source).forEach(key => {
    if (typeof source[key] === 'object' && source[key] !== null) {
      result[key] = syncStructure(
        source[key], 
        (target && typeof target[key] === 'object') ? target[key] : {}
      );
    } else {
      result[key] = (target && target[key] !== undefined) ? target[key] : '';
    }
  });
  
  return result;
}

// Sync all locale files
localeFiles.forEach(file => {
  const locale = path.basename(file, '.json');
  if (locale === sourceLanguage) return;
  
  console.log(`Syncing ${locale}...`);
  const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  // Create synced structure
  const syncedTranslations = syncStructure(sourceTranslations, translations);
  
  // Write back to file
  fs.writeFileSync(file, JSON.stringify(syncedTranslations, null, 2));
  console.log(`✅ Updated ${locale}`);
});

console.log('✅ All translation files synchronized successfully!'); 