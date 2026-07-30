#!/usr/bin/env bun
/**
 * Extract translatable strings from the Astro app and shared package.
 * Updates the source language file with any new keys found.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Glob } from 'bun';

// Configuration
const ROOT_DIR = dirname(dirname(import.meta.path));
const SOURCE_LANGUAGE = 'en';
const LOCALES_DIR = join(ROOT_DIR, 'locales');
const OUTPUT_FILE = join(LOCALES_DIR, `${SOURCE_LANGUAGE}.json`);

// File patterns to scan. The Astro app resolves translations at build time
// through the `t('key')` helper, so there is no `data-i18n` HTML surface.
const HTML_PATTERNS: string[] = [];
const TS_PATTERNS = [
  'apps/web/src/**/*.astro',
  'apps/web/src/**/*.ts',
  'packages/shared/src/**/*.ts',
];

// Load existing translations if available
let existingTranslations: Record<string, unknown> = {};
if (existsSync(OUTPUT_FILE)) {
  existingTranslations = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'));
  console.log(`Loaded existing translations from ${OUTPUT_FILE}`);
} else {
  console.log('No existing translations found, creating new file');
}

// Extract keys from HTML files (data-i18n attributes)
const htmlKeys = new Set<string>();
for (const pattern of HTML_PATTERNS) {
  const glob = new Glob(pattern);
  for (const file of glob.scanSync(ROOT_DIR)) {
    const content = readFileSync(join(ROOT_DIR, file), 'utf8');
    const dataI18nRegex = /data-i18n="([^"]+)"/g;
    for (const match of content.matchAll(dataI18nRegex)) {
      htmlKeys.add(match[1]);
    }
  }
}

// Extract keys from source files (build-time t() calls)
const tsKeys = new Set<string>();
const i18nPatterns = [
  /(?<![\w.])t\(['"]([^'"]+)['"]\)/g, // t('key')
  /(?<![\w.])t\(`([^`]+)`\)/g, // t(`key`)
];
for (const pattern of TS_PATTERNS) {
  const glob = new Glob(pattern);
  for (const file of glob.scanSync(ROOT_DIR)) {
    const content = readFileSync(join(ROOT_DIR, file), 'utf8');
    for (const regex of i18nPatterns) {
      for (const match of content.matchAll(regex)) {
        tsKeys.add(match[1]);
      }
    }
  }
}

// Combine all keys
const allKeys = new Set([...htmlKeys, ...tsKeys]);
console.log(`Found ${allKeys.size} translatable strings`);
console.log(`  - ${htmlKeys.size} from HTML files`);
console.log(`  - ${tsKeys.size} from TS files`);

// Create nested structure from dot notation
function createNestedObject(
  obj: Record<string, unknown>,
  key: string,
  value: string
): Record<string, unknown> {
  const keys = key.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }

  // Only set value if it doesn't exist or is empty
  const lastKey = keys[keys.length - 1];
  if (!current[lastKey] || current[lastKey] === '') {
    current[lastKey] = value || keys[keys.length - 1];
  }

  return obj;
}

// Get nested value from dot notation
function getNestedValue(obj: Record<string, unknown>, key: string): string | undefined {
  const keys = key.split('.');
  let current: unknown = obj;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

// Build translation object
let translations = JSON.parse(JSON.stringify(existingTranslations));
for (const key of allKeys) {
  const existingValue = getNestedValue(existingTranslations, key) || '';
  translations = createNestedObject(translations, key, existingValue);
}

// Write to file
writeFileSync(OUTPUT_FILE, `${JSON.stringify(translations, null, 2)}\n`);
console.log(`Updated translations written to ${OUTPUT_FILE}`);

// Output missing translations
const missingCount = [...allKeys].filter((key) => {
  const value = getNestedValue(translations, key);
  return !value || value === key.split('.').pop();
}).length;

console.log(`Missing translations: ${missingCount}/${allKeys.size}`);
