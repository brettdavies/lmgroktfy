import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@lmgroktfy/shared';
import ar from '../../../../locales/ar.json';
import de from '../../../../locales/de.json';
import en from '../../../../locales/en.json';
import es from '../../../../locales/es.json';
import fr from '../../../../locales/fr.json';
import ja from '../../../../locales/ja.json';

type Locale = (typeof SUPPORTED_LOCALES)[number];
type Catalog = Record<string, unknown>;

const CATALOGS: Record<Locale, Catalog> = {
  ar: ar as Catalog,
  de: de as Catalog,
  en: en as Catalog,
  es: es as Catalog,
  fr: fr as Catalog,
  ja: ja as Catalog,
};

function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

function lookup(catalog: Catalog, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, catalog);
}

/**
 * Build-time translator for a locale. Resolves a dot-path key against the
 * locale catalog, falling back to the default locale and finally to the raw
 * key so a missing string surfaces visibly rather than rendering blank.
 */
export function useTranslations(locale: string | undefined): (key: string) => string {
  const active = resolveLocale(locale);
  return (key) => {
    const value = lookup(CATALOGS[active], key);
    if (typeof value === 'string') {
      return value;
    }
    const fallback = lookup(CATALOGS[DEFAULT_LOCALE], key);
    return typeof fallback === 'string' ? fallback : key;
  };
}

function normalizePlaceholders(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).filter(
      (entry): entry is string => typeof entry === 'string'
    );
  }
  return null;
}

/**
 * Rotating input placeholders for a locale as a flat string array. Source
 * catalogs store this list either as a JSON array (`en`) or as an
 * ordinal-keyed object (translated locales); both normalize to the same shape.
 */
export function getPlaceholders(locale: string | undefined): string[] {
  const active = resolveLocale(locale);
  return (
    normalizePlaceholders(lookup(CATALOGS[active], 'main.placeholders')) ??
    normalizePlaceholders(lookup(CATALOGS[DEFAULT_LOCALE], 'main.placeholders')) ??
    []
  );
}
