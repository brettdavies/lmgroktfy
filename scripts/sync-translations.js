/**
 * @fileoverview Synchronize translation files to ensure consistent structure
 * 
 * This script ensures all translation files have the same structure as the source language file.
 * It preserves existing translations while adding missing keys and removing extra keys.
 * The script is useful for maintaining consistency across all language files after
 * adding or removing keys from the source language.
 * 
 * @module scripts/sync-translations
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
const sourceFile = path.join(__dirname, '..', 'locales', `${sourceLanguage}.json`);
const localeFiles = glob.sync('locales/*.json');

// Load source translations
const sourceTranslations = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

/**
 * Synchronize the structure of a target translation object with the source
 * 
 * This function recursively traverses the source object and creates a new object
 * with the same structure, preserving values from the target where they exist.
 * Keys that exist in the target but not in the source are omitted from the result.
 * 
 * @param {Object} source - The source translation object (usually English)
 * @param {Object} target - The target translation object to synchronize
 * @returns {Object} A new object with the source structure and target values
 */
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

// Process each locale file
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