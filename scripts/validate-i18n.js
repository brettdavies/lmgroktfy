/**
 * @fileoverview Validate translation files for completeness and correctness
 * 
 * This script validates all translation files against the source language file.
 * It checks for missing keys, extra keys, and calculates completion percentages.
 * The script will exit with an error code if any translations are incomplete.
 * 
 * @module scripts/validate-i18n
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
 * Find keys that exist in the source but are missing in the target
 * 
 * @param {Object} source - The source translation object (usually English)
 * @param {Object} target - The target translation object to validate
 * @param {string} [prefix=''] - The current key prefix for nested objects
 * @returns {string[]} Array of missing key paths in dot notation
 */
function findMissingKeys(source, target, prefix = '') {
  const missing = [];
  
  Object.keys(source).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        missing.push(fullKey);
      } else {
        missing.push(...findMissingKeys(source[key], target[key], fullKey));
      }
    } else if (!target || target[key] === undefined) {
      missing.push(fullKey);
    }
  });
  
  return missing;
}

/**
 * Find keys that exist in the target but not in the source
 * 
 * @param {Object} source - The source translation object (usually English)
 * @param {Object} target - The target translation object to validate
 * @param {string} [prefix=''] - The current key prefix for nested objects
 * @returns {string[]} Array of extra key paths in dot notation
 */
function findExtraKeys(source, target, prefix = '') {
  const extra = [];
  
  Object.keys(target).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof target[key] === 'object' && target[key] !== null) {
      if (!source[key] || typeof source[key] !== 'object') {
        extra.push(fullKey);
      } else {
        extra.push(...findExtraKeys(source[key], target[key], fullKey));
      }
    } else if (!source || source[key] === undefined) {
      extra.push(fullKey);
    }
  });
  
  return extra;
}

/**
 * Count the total number of leaf keys in an object
 * 
 * @param {Object} obj - The object to count keys in
 * @param {string} [prefix=''] - The current key prefix for nested objects
 * @returns {number} The total count of leaf keys
 */
function countKeys(obj, prefix = '') {
  let count = 0;
  
  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countKeys(obj[key], fullKey);
    } else {
      count++;
    }
  });
  
  return count;
}

// Validate all locale files
let hasErrors = false;
localeFiles.forEach(file => {
  const locale = path.basename(file, '.json');
  if (locale === sourceLanguage) return;
  
  console.log(`\nValidating ${locale}...`);
  const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  // Check for missing keys
  const missingKeys = findMissingKeys(sourceTranslations, translations);
  if (missingKeys.length > 0) {
    hasErrors = true;
    console.log(`❌ Missing ${missingKeys.length} keys in ${locale}:`);
    missingKeys.forEach(key => console.log(`  - ${key}`));
  } else {
    console.log(`✅ No missing keys in ${locale}`);
  }
  
  // Check for extra keys
  const extraKeys = findExtraKeys(sourceTranslations, translations);
  if (extraKeys.length > 0) {
    console.log(`⚠️ Found ${extraKeys.length} extra keys in ${locale} that don't exist in ${sourceLanguage}:`);
    extraKeys.forEach(key => console.log(`  - ${key}`));
  } else {
    console.log(`✅ No extra keys in ${locale}`);
  }
  
  // Calculate completion percentage
  const totalKeys = countKeys(sourceTranslations);
  const missingCount = missingKeys.length;
  const completionPercentage = ((totalKeys - missingCount) / totalKeys * 100).toFixed(2);
  console.log(`📊 Translation completion: ${completionPercentage}%`);
});

// Exit with error code if validation failed
if (hasErrors) {
  console.log('\n❌ Validation failed. Please fix the missing translations.');
  process.exit(1);
} else {
  console.log('\n✅ All translations are complete!');
} 