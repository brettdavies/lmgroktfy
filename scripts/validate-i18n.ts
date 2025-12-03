#!/usr/bin/env bun
/**
 * Validate translation files for completeness and correctness
 * Compares all locale files against the source language (en)
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

// Find missing keys in target compared to source
function findMissingKeys(
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
          ...findMissingKeys(
            source[key] as TranslationObject,
            target[key] as TranslationObject,
            fullKey
          )
        );
      }
    } else if (!target || target[key] === undefined) {
      missing.push(fullKey);
    }
  }

  return missing;
}

// Find extra keys in target that don't exist in source
function findExtraKeys(
  source: TranslationObject,
  target: TranslationObject,
  prefix = ''
): string[] {
  const extra: string[] = [];

  for (const key of Object.keys(target)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof target[key] === 'object' && target[key] !== null) {
      if (!source[key] || typeof source[key] !== 'object') {
        extra.push(fullKey);
      } else {
        extra.push(
          ...findExtraKeys(
            source[key] as TranslationObject,
            target[key] as TranslationObject,
            fullKey
          )
        );
      }
    } else if (!source || source[key] === undefined) {
      extra.push(fullKey);
    }
  }

  return extra;
}

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

// Get all locale files
const localeFiles = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('test-'))
  .map((f) => join(LOCALES_DIR, f));

// Validate all locale files
let hasErrors = false;

for (const file of localeFiles) {
  const locale = basename(file, '.json');
  if (locale === SOURCE_LANGUAGE) continue;

  console.log(`\nValidating ${locale}...`);
  const translations: TranslationObject = JSON.parse(readFileSync(file, 'utf8'));

  // Check for missing keys
  const missingKeys = findMissingKeys(sourceTranslations, translations);
  if (missingKeys.length > 0) {
    hasErrors = true;
    console.log(`❌ Missing ${missingKeys.length} keys in ${locale}:`);
    for (const key of missingKeys) {
      console.log(`  - ${key}`);
    }
  } else {
    console.log(`✅ No missing keys in ${locale}`);
  }

  // Check for extra keys
  const extraKeys = findExtraKeys(sourceTranslations, translations);
  if (extraKeys.length > 0) {
    console.log(
      `⚠️ Found ${extraKeys.length} extra keys in ${locale} that don't exist in ${SOURCE_LANGUAGE}:`
    );
    for (const key of extraKeys) {
      console.log(`  - ${key}`);
    }
  } else {
    console.log(`✅ No extra keys in ${locale}`);
  }

  // Calculate completion percentage
  const totalKeys = countKeys(sourceTranslations);
  const missingCount = missingKeys.length;
  const completionPercentage = (((totalKeys - missingCount) / totalKeys) * 100).toFixed(2);
  console.log(`📊 Translation completion: ${completionPercentage}%`);
}

// Exit with error code if validation failed
if (hasErrors) {
  console.log('\n❌ Validation failed. Please fix the missing translations.');
  process.exit(1);
} else {
  console.log('\n✅ All translations are complete!');
}
