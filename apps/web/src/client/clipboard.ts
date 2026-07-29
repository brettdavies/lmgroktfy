import { getIslandConfig } from './config';
import { elements } from './dom';
import { showToast } from './transitions';

/**
 * Clipboard + shareable-text generation. Toast copy is already localized by the
 * server and read from the island config, so no client-side translator is needed.
 */

type ToastKey = 'copy_qa' | 'copy_answer' | 'copy_link';
export type ShareableTextType = 'qa' | 'answer' | 'url' | 'tweet' | 'shareUrl';

export async function copyText(text: string, toastKey: ToastKey): Promise<void> {
  const { toasts } = getIslandConfig();
  try {
    await navigator.clipboard.writeText(text);
    showToast(toasts[toastKey]);
  } catch (error) {
    console.error('[clipboard] copy failed:', error);
    showToast(toasts.error);
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
