#!/usr/bin/env bun
/**
 * Synchronize translation files to ensure consistent structure
 * Adds missing keys from source language to all other locale files
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

// Configuration
const ROOT_DIR = dirname(dirname(import.meta.path));
const SOURCE_LANGUAGE = 'en';
const LOCALES_DIR = join(ROOT_DIR, 'locales');
const SOURCE_FILE = join(LOCALES_DIR, `${SOURCE_LANGUAGE}.json`);

type TranslationObject = Record<string, unknown>;

// Load source translations
const sourceTranslations: TranslationObject = JSON.parse(readFileSync(SOURCE_FILE, 'utf8'));

// Sync target structure with source
function syncStructure(source: TranslationObject, target: TranslationObject): TranslationObject {
  const result: TranslationObject = {};

  // Add all keys from source, keeping target values where they exist
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      result[key] = syncStructure(
        source[key] as TranslationObject,
        target && typeof target[key] === 'object'
          ? (target[key] as TranslationObject)
          : {}
      );
    } else {
      result[key] = target && target[key] !== undefined ? target[key] : '';
    }
  }

  return result;
}

// Get all locale files (excluding test files)
const localeFiles = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('test-'))
  .map((f) => join(LOCALES_DIR, f));

// Sync all locale files
for (const file of localeFiles) {
  const locale = basename(file, '.json');
  if (locale === SOURCE_LANGUAGE) continue;

  console.log(`Syncing ${locale}...`);
  const translations: TranslationObject = JSON.parse(readFileSync(file, 'utf8'));

  // Create synced structure
  const syncedTranslations = syncStructure(sourceTranslations, translations);

  // Write back to file
  writeFileSync(file, `${JSON.stringify(syncedTranslations, null, 2)}\n`);
  console.log(`✅ Updated ${locale}`);
}

console.log('\n✅ All translation files synchronized successfully!');
