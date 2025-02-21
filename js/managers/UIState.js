/**
 * @typedef {Object} UIElements
 * @property {function(): HTMLElement} question - Question input element
 * @property {function(): HTMLElement} answer - Answer display element
 * @property {function(): HTMLElement} loading - Loading indicator element
 * @property {function(): HTMLElement} response - Response container element
 * @property {function(): HTMLElement} questionForm - Question form element
 * @property {function(): HTMLElement} toast - Toast notification element
 * @property {function(): HTMLElement} toastMessage - Toast message element
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
        this.elements.loading().style.display = 'block';
        this.elements.response().style.display = 'none';
    },

    /**
     * Hides the loading state
     */
    hideLoading() {
        this.elements.loading().style.display = 'none';
    },

    /**
     * Shows error state and hides all action buttons
     */
    showError() {
        this.elements.answer().innerText = 'Oops, something went wrong!';
        this.hideAllButtons();
        this.elements.response().style.display = 'block';
    },

    /**
     * Shows success state with answer and updates all necessary UI elements
     * @param {string} answer - The answer text to display
     * @param {string} question - The question for updating Grok buttons
     */
    showSuccess(answer, question) {
        this.elements.answer().innerText = answer;
        this.updateGrokButtons(question);
        this.showAllButtons();
        this.elements.response().style.display = 'block';
        this.elements.questionForm().style.display = 'none';
    },

    /**
     * Hides all action buttons
     */
    hideAllButtons() {
        Object.values(this.elements.buttons).forEach(btn => btn().style.display = 'none');
    },

    /**
     * Shows all action buttons
     */
    showAllButtons() {
        Object.values(this.elements.buttons).forEach(btn => btn().style.display = 'inline-block');
    },

    /**
     * Updates Grok-related button URLs with the current question
     * @param {string} question - The question to encode in the URLs
     */
    updateGrokButtons(question) {
        const encodedQuestion = encodeURIComponent(question);
        this.elements.buttons.continueLink().href = `https://grok.com/?q=${encodedQuestion}`;
        this.elements.buttons.useGrok().href = `https://x.com/i/grok?text=${encodedQuestion}`;
    },

    /**
     * Shows a toast notification with the specified message
     * @param {string} message - The message to display in the toast
     */
    showToast(message) {
        const toast = this.elements.toast();
        const toastMessage = this.elements.toastMessage();
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1000);
    }
}; 