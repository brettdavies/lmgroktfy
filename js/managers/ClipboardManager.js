import { UIState } from './UIState.js';

/**
 * Manages clipboard operations and text sharing functionality
 * @namespace ClipboardManager
 */
export const ClipboardManager = {
    /**
     * Copies text to clipboard and shows a success toast
     * @async
     * @param {string} text - The text to copy to clipboard
     * @param {string} successMessage - Message to show in toast on successful copy
     * @throws {Error} When clipboard access is denied or fails
     */
    async copyText(text, successMessage) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('[Copy] Copied:', text);
            UIState.showToast(successMessage);
        } catch (err) {
            console.error('[Copy] Copy failed:', err);
            alert('Failed to copy. Please try again.');
        }
    },

    /**
     * Generates shareable text based on the specified type
     * @param {'qa'|'answer'|'url'|'tweet'|'shareUrl'} type - The type of shareable text to generate
     * @returns {string} Formatted text for sharing
     */
    getShareableText(type) {
        const url = window.location.href;
        const question = decodeURIComponent(UIState.elements.question().value);
        const answer = decodeURIComponent(UIState.elements.answer().innerText);
        const suffix = ' - Answer by Grok';
        const suffix2 = ' via lmgroktfy.com';
        switch (type) {
            case 'qa':
                return `Question: ${question}\nAnswer: ${answer}${suffix}${suffix2}`;
            case 'answer':
                return `${answer}${suffix}${suffix2}`;
            case 'url':
                return url;
            case 'shareUrl':
                return encodeURIComponent(url);
            case 'tweet':
                return `Question: ${question} Answer: ${answer}${suffix}`;
            default:
                return '';
        }
    }
};
