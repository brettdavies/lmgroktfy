/**
 * @typedef {Object} UIElements
 * @property {function(): HTMLElement} question - Question input element
 * @property {function(): HTMLElement} answer - Answer display element
 * @property {function(): HTMLElement} loading - Loading indicator element
 * @property {function(): HTMLElement} response - Response container element
 * @property {function(): HTMLElement} questionForm - Question form element
 * @property {function(): HTMLElement} toast - Toast notification element
 * @property {function(): HTMLElement} toastMessage - Toast message element
 * @property {function(): HTMLElement} questionDisplay - Question display element
 * @property {Object} buttons - Collection of button elements
 */

/**
 * Manages the UI state and DOM manipulations for the application
 * @namespace UIState
 */
export const UIState = {
    /**
     * Collection of getter functions for DOM elements
     * @type {UIElements}
     */
    elements: {
        question: () => document.getElementById('question-input'),
        answer: () => document.getElementById('answer'),
        loading: () => document.getElementById('loading'),
        response: () => document.getElementById('response'),
        questionForm: () => document.getElementById('question-form'),
        toast: () => document.getElementById('toast'),
        toastMessage: () => document.getElementById('toast-message'),
        questionDisplay: () => document.getElementById('question-display'),
        buttons: {
            continueLink: () => document.getElementById('continue-link'),
            useGrok: () => document.getElementById('use-grok-button'),
            share: () => document.getElementById('share-button'),
            copyQA: () => document.getElementById('copy-question-answer-button'),
            copyAnswer: () => document.getElementById('copy-answer-button'),
            shareOnX: () => document.getElementById('share-on-x-button')
        }
    },
    
    /**
     * Shows the loading state and hides the response container
     */
    showLoading() {
        this.elements.loading().classList.remove('hidden');
        this.elements.response().classList.add('hidden');
    },

    /**
     * Hides the loading state
     */
    hideLoading() {
        this.elements.loading().classList.add('hidden');
    },

    /**
     * Shows error state and hides all action buttons
     */
    showError() {
        this.elements.questionForm().classList.add('hidden');
        this.elements.answer().innerText = 'Oops, something went wrong!';
        this.hideAllButtons();
        this.elements.response().classList.remove('hidden');
    },

    /**
     * Shows success state with answer and updates all necessary UI elements
     * @param {string} answer - The answer text to display
     * @param {string} question - The question for updating Grok buttons
     */
    showSuccess(answer, question) {
        this.elements.questionForm().classList.add('hidden');
        this.elements.questionDisplay().innerText = question;
        this.elements.answer().innerText = answer;
        this.updateGrokButtons(question);
        this.showAllButtons();
        this.elements.response().classList.remove('hidden');
    },

    /**
     * Hides all action buttons
     */
    hideAllButtons() {
        Object.values(this.elements.buttons).forEach(btn => btn().classList.add('hidden'));
    },

    /**
     * Shows all action buttons
     */
    showAllButtons() {
        Object.values(this.elements.buttons).forEach(btn => btn().classList.remove('hidden'));
    },

    /**
     * Updates Grok-related button URLs with the current question
     * @param {string} question - The question to encode in the URLs
     */
    updateGrokButtons(question) {
        this.elements.buttons.continueLink().href = `https://grok.com/?q=${question}&utm_source=lmgroktfy`;
        this.elements.buttons.useGrok().href = `https://x.com/i/grok?text=${question}&utm_source=lmgroktfy`;
    },

    /**
     * Shows a toast notification with the specified message
     * @param {string} message - The message to display in the toast
     */
    showToast(message) {
        const toast = this.elements.toast();
        const toastMessage = this.elements.toastMessage();
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
}; 