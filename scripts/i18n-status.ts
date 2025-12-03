#!/usr/bin/env bun
/**
 * Generate a status report for all translations
 * Shows completion percentages and missing translations by language
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

// Configuration
const ROOT_DIR = dirname(dirname(import.meta.path));
const SOURCE_LANGUAGE = 'en';
const LOCALES_DIR = join(ROOT_DIR, 'locales');
const SOURCE_FILE = join(LOCALES_DIR, `${SOURCE_LANGUAGE}.json`);

type TranslationObject = Record<string, unknown>;

// Load source translations
const sourceTranslations: TranslationObject = JSON.parse(readFileSync(SOURCE_FILE, 'utf8'));

// Count total keys in an object
function countKeys(obj: TranslationObject): number {
  let count = 0;

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countKeys(obj[key] as TranslationObject);
    } else {
      count++;
    }
  }

  return count;
}

// Count empty values in an object
function countEmptyValues(obj: TranslationObject): number {
  let count = 0;

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countEmptyValues(obj[key] as TranslationObject);
    } else if (obj[key] === '') {
      count++;
    }
  }

  return count;
}

// Find missing translations
function findMissingTranslations(
  source: TranslationObject,
  target: TranslationObject,
  prefix = ''
): string[] {
  const missing: string[] = [];

  for (const key of Object.keys(source)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        missing.push(fullKey);
      } else {
        missing.push(
          ...findMissingTranslations(
            source[key] as TranslationObject,
            target[key] as TranslationObject,
            fullKey
          )
        );
      }
    } else if (!target || target[key] === undefined || target[key] === '') {
      missing.push(fullKey);
    }
  }

  return missing;
}

// Get all locale files (excluding test files)
const localeFiles = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('test-'))
  .map((f) => join(LOCALES_DIR, f));

// Generate status report
console.log('# Translation Status Report\n');
console.log('| Language | Total Keys | Translated | Empty | Completion |');
console.log('|----------|------------|------------|-------|------------|');

for (const file of localeFiles) {
  const locale = basename(file, '.json');
  const translations: TranslationObject = JSON.parse(readFileSync(file, 'utf8'));

  const totalKeys = countKeys(translations);
  const emptyKeys = countEmptyValues(translations);
  const translatedKeys = totalKeys - emptyKeys;
  const completionPercentage = ((translatedKeys / totalKeys) * 100).toFixed(2);

  console.log(
    `| ${locale.padEnd(8)} | ${String(totalKeys).padEnd(10)} | ${String(translatedKeys).padEnd(10)} | ${String(emptyKeys).padEnd(5)} | ${completionPercentage.padStart(7)}% |`
  );
}

console.log('\n## Missing Translations by Language\n');

for (const file of localeFiles) {
  const locale = basename(file, '.json');
  if (locale === SOURCE_LANGUAGE) continue;

  const translations: TranslationObject = JSON.parse(readFileSync(file, 'utf8'));
  const missingTranslations = findMissingTranslations(sourceTranslations, translations);

  if (missingTranslations.length > 0) {
    console.log(`### ${locale} (${missingTranslations.length} missing)\n`);
    for (const key of missingTranslations) {
      console.log(`- \`${key}\``);
    }
    console.log('');
  } else {
    console.log(`### ${locale} (Complete!)\n`);
  }
}
