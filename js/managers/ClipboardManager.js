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
     * @param {'qa'|'answer'|'url'|'tweet'} type - The type of shareable text to generate
     * @returns {string} Formatted text for sharing
     */
    getShareableText(type) {
        const question = UIState.elements.question().value;
        const answer = UIState.elements.answer().innerText;
        const suffix = ' - Answer by Grok via lmgroktfy.com';
        
        switch (type) {
            case 'qa':
                return `Question: ${question} - Answer: ${answer}${suffix}`;
            case 'answer':
                return `${answer}${suffix}`;
            case 'url':
                return window.location.href;
            case 'tweet':
                return encodeURIComponent(`Question: ${question} - Answer: ${answer}${suffix}`);
            default:
                return '';
        }
    }
}; 