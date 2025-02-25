/**
 * Generate a status report for all translations
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

// Count total keys in an object
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

// Count empty values in an object
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

// Generate status report
console.log('# Translation Status Report\n');
console.log('| Language | Total Keys | Translated | Empty | Completion |');
console.log('|----------|------------|------------|-------|------------|');

const totalSourceKeys = countKeys(sourceTranslations);

localeFiles.forEach(file => {
  const locale = path.basename(file, '.json');
  const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  const totalKeys = countKeys(translations);
  const emptyKeys = countEmptyValues(translations);
  const translatedKeys = totalKeys - emptyKeys;
  const completionPercentage = ((translatedKeys / totalKeys) * 100).toFixed(2);
  
  console.log(`| ${locale} | ${totalKeys} | ${translatedKeys} | ${emptyKeys} | ${completionPercentage}% |`);
});

console.log('\n## Missing Translations by Language\n');

localeFiles.forEach(file => {
  const locale = path.basename(file, '.json');
  if (locale === sourceLanguage) return;
  
  const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  // Find missing translations
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
  
  const missingTranslations = findMissingTranslations(sourceTranslations, translations);
  
  if (missingTranslations.length > 0) {
    console.log(`### ${locale} (${missingTranslations.length} missing)\n`);
    missingTranslations.forEach(key => console.log(`- \`${key}\``));
    console.log('');
  } else {
    console.log(`### ${locale} (Complete!)\n`);
  }
}); 