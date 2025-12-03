import { EXTERNAL_URLS } from '../constants/ui';

/**
 * Encodes a question for use in a URL
 * @param question - The question to encode
 * @returns URL-encoded question string
 */
export function encodeQuestionForUrl(question: string): string {
  return encodeURIComponent(question);
}

/**
 * Gets the Grok URL for a given question
 * @param question - The question to include in the URL
 * @returns Full Grok URL with question and UTM source
 */
export function getGrokUrl(question: string): string {
  const encoded = encodeQuestionForUrl(question);
  return `${EXTERNAL_URLS.GROK_BASE}?q=${encoded}&utm_source=${EXTERNAL_URLS.UTM_SOURCE}`;
}

/**
 * Gets the X/Grok URL for a given question
 * @param question - The question to include in the URL
 * @returns Full X/Grok URL with question and UTM source
 */
export function getXGrokUrl(question: string): string {
  const encoded = encodeQuestionForUrl(question);
  return `${EXTERNAL_URLS.GROK_X_BASE}?text=${encoded}&utm_source=${EXTERNAL_URLS.UTM_SOURCE}`;
}

/**
 * Checks if a hostname indicates local development
 * @param hostname - The hostname to check
 * @returns True if the hostname is a local development host
 */
export function isLocalDevelopment(hostname: string): boolean {
  const localPatterns = [
    'localhost',
    '127.0.0.1',
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  ];

  return localPatterns.some((pattern) =>
    typeof pattern === 'string' ? hostname === pattern : pattern.test(hostname)
  );
}

/**
 * Extracts a question from a URL path or query string
 * @param url - The URL to parse
 * @returns The extracted question or null if not found
 */
export function extractQuestionFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url, 'http://localhost');

    // Check query parameter first
    const queryQuestion = urlObj.searchParams.get('q') || urlObj.searchParams.get('question');
    if (queryQuestion) {
      return decodeURIComponent(queryQuestion);
    }

    // Check path (everything after first /)
    const path = urlObj.pathname.slice(1);
    if (path && path !== '/') {
      return decodeURIComponent(path.replace(/\+/g, ' '));
    }

    return null;
  } catch {
    return null;
  }
}
