/**
 * @fileoverview Generate a status report for all translations
 * 
 * This script generates a comprehensive status report for all translation files.
 * It calculates completion percentages, counts empty values, and lists missing translations.
 * The report is output in Markdown format for easy inclusion in documentation.
 * 
 * @module scripts/i18n-status
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

/**
 * Count the number of empty string values in an object
 * 
 * @param {Object} obj - The object to count empty values in
 * @param {string} [prefix=''] - The current key prefix for nested objects
 * @returns {number} The count of empty string values
 */
function countEmptyValues(obj, prefix = '') {
  let count = 0;
  
  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countEmptyValues(obj[key], fullKey);
    } else if (obj[key] === '') {
      count++;
    }
  });
  
  return count;
}

/**
 * Find keys with missing or empty translations in the target compared to source
 * 
 * @param {Object} source - The source translation object (usually English)
 * @param {Object} target - The target translation object to check
 * @param {string} [prefix=''] - The current key prefix for nested objects
 * @returns {string[]} Array of keys with missing or empty translations
 */
function findMissingTranslations(source, target, prefix = '') {
  const missing = [];
  
  Object.keys(source).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        missing.push(fullKey);
      } else {
        missing.push(...findMissingTranslations(source[key], target[key], fullKey));
      }
    } else if (!target || target[key] === undefined || target[key] === '') {
      missing.push(fullKey);
    }
  });
  
  return missing;
}

// Generate status report
console.log('# Translation Status Report\n');
console.log('| Language | Total Keys | Translated | Empty | Completion |');
console.log('|----------|------------|------------|-------|------------|');

const totalSourceKeys = countKeys(sourceTranslations);

// Generate summary table
localeFiles.forEach(file => {
  const locale = path.basename(file, '.json');
  const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  const totalKeys = countKeys(translations);
  const emptyKeys = countEmptyValues(translations);
  const translatedKeys = totalKeys - emptyKeys;
  const completionPercentage = ((translatedKeys / totalKeys) * 100).toFixed(2);
  
  console.log(`| ${locale} | ${totalKeys} | ${translatedKeys} | ${emptyKeys} | ${completionPercentage}% |`);
});

// Generate detailed missing translations report
console.log('\n## Missing Translations by Language\n');

localeFiles.forEach(file => {
  const locale = path.basename(file, '.json');
  if (locale === sourceLanguage) return;
  
  const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  const missingTranslations = findMissingTranslations(sourceTranslations, translations);
  
  if (missingTranslations.length > 0) {
    console.log(`### ${locale} (${missingTranslations.length} missing)\n`);
    missingTranslations.forEach(key => console.log(`- \`${key}\``));
    console.log('');
  } else {
    console.log(`### ${locale} (Complete!)\n`);
  }
}); 