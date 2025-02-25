import { UIState } from './UIState.js';
import { i18n } from '../i18n/i18n.js';

/**
 * Manages clipboard operations and text sharing functionality
 * @namespace ClipboardManager
 */
export const ClipboardManager = {
    /**
     * Copies text to clipboard and shows a success toast
     * @async
     * @param {string} text - The text to copy to clipboard
     * @param {string} toastKey - Key for the localized toast message
     * @throws {Error} When clipboard access is denied or fails
     */
    async copyText(text, toastKey) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('[Copy] Copied:', text);
            const message = i18n.getTranslation(`toast.${toastKey}`);
            UIState.showToast(message);
        } catch (err) {
            console.error('[Copy] Copy failed:', err);
            const errorMessage = i18n.getTranslation('toast.error');
            UIState.showToast(errorMessage);
        }
    },

    /**
     * Generates shareable text based on the specified type
     * @param {'qa'|'answer'|'url'|'tweet'|'shareUrl'} type - The type of shareable text to generate
     * @returns {string} Formatted text for sharing
     */
    getShareableText(type) {
        const url = window.location.href;
        const question = decodeURIComponent(UIState.elements.questionDisplay().innerText);
        const prefix = 'Grok says: ';
        const answer = decodeURIComponent(UIState.elements.answer().innerText);
        const suffix2 = ' via lmgroktfy.com';
        switch (type) {
            case 'qa':
                return `${question}\n${prefix}${answer}${suffix2}`;
            case 'answer':
                return `${prefix}${answer}${suffix2}`;
            case 'url':
                return url;
            case 'shareUrl':
                return encodeURIComponent(url);
            case 'tweet':
                return `${question} ${prefix}${answer}${suffix2}`;
            default:
                return '';
        }
    }
};
