import { ELEMENT_IDS } from '@lmgroktfy/shared';

/**
 * Localized strings the island needs at runtime, handed over from the server via
 * `data-*` attributes on the form. The server owns i18n (Astro URL routing), so
 * the island reads the already-localized placeholders and toast copy from the
 * DOM rather than shipping a client-side translator.
 */
export interface IslandConfig {
  placeholders: string[];
  toasts: {
    copy_qa: string;
    copy_answer: string;
    copy_link: string;
    error: string;
  };
}

let cached: IslandConfig | null = null;

function parsePlaceholders(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

export function getIslandConfig(): IslandConfig {
  if (cached) return cached;

  const form = document.getElementById(ELEMENT_IDS.QUESTION_FORM);
  const data = form?.dataset ?? {};

  cached = {
    placeholders: parsePlaceholders(data.placeholders),
    toasts: {
      copy_qa: data.toastCopyQa ?? '',
      copy_answer: data.toastCopyAnswer ?? '',
      copy_link: data.toastCopyLink ?? '',
      error: data.toastError ?? '',
    },
  };
  return cached;
}
