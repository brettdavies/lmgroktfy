import { i18n } from '../i18n';
import { elements, showToast } from '../ui';

/**
 * Clipboard Manager - handles copy operations and shareable text generation.
 */

export type ShareableTextType = 'qa' | 'answer' | 'url' | 'tweet' | 'shareUrl';

export async function copyText(text: string, toastKey: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    const message = i18n.getTranslation(`toast.${toastKey}`);
    showToast(typeof message === 'string' ? message : String(message));
  } catch (err) {
    console.error('[ClipboardManager] Copy failed:', err);
    const errorMessage = i18n.getTranslation('toast.error');
    showToast(typeof errorMessage === 'string' ? errorMessage : String(errorMessage));
  }
}

export function getShareableText(type: ShareableTextType): string {
  const url = window.location.href;
  const questionDisplay = elements.questionDisplay();
  const answerElement = elements.answer();

  const question = questionDisplay ? decodeURIComponent(questionDisplay.innerText) : '';
  const answer = answerElement ? decodeURIComponent(answerElement.innerText) : '';
  const prefix = 'Grok says: ';
  const suffix = ' via lmgroktfy.com';

  switch (type) {
    case 'qa':
      return `${question}\n${prefix}${answer}${suffix}`;
    case 'answer':
      return `${prefix}${answer}${suffix}`;
    case 'url':
      return url;
    case 'shareUrl':
      return encodeURIComponent(url);
    case 'tweet':
      return `${question} ${prefix}${answer}${suffix}`;
    default:
      return '';
  }
}

export const ClipboardManager = {
  copyText,
  getShareableText,
};
