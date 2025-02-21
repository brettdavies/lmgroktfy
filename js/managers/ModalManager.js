/**
 * Manages help modal functionality and interactions
 * @namespace ModalManager
 */
export const ModalManager = {
    /** @type {HTMLElement|null} Modal container element */
    modal: null,
    
    /** @type {HTMLElement|null} Modal backdrop element */
    backdrop: null,
    
    /** @type {HTMLElement|null} Help button that triggers modal */
    helpButton: null,
    
    /** @type {HTMLElement|null} Close button within modal */
    closeButton: null,

    /**
     * Shows the modal and backdrop with fade animation
     */
    show() {
        this.modal.style.display = 'block';
        this.backdrop.style.display = 'block';
        this.modal.classList.add('fade-in');
        this.backdrop.classList.add('fade-in');
    },

    /**
     * Hides the modal and backdrop, removing fade animation
     */
    hide() {
        this.modal.style.display = 'none';
        this.backdrop.style.display = 'none';
        this.modal.classList.remove('fade-in');
        this.backdrop.classList.remove('fade-in');
    },

    /**
     * Initializes modal functionality
     * - Sets up DOM references
     * - Adds event listeners for showing/hiding modal
     */
    initialize() {
        this.modal = document.getElementById('help-modal');
        this.backdrop = document.getElementById('modal-backdrop');
        this.helpButton = document.getElementById('help-button');
        this.closeButton = this.modal.querySelector('.modal-close');

        this.helpButton.addEventListener('click', () => this.show());
        this.closeButton.addEventListener('click', () => this.hide());
        this.backdrop.addEventListener('click', () => this.hide());
    }
}; 