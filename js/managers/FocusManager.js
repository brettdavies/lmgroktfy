/**
 * FocusManager
 * Handles focus management for modal dialogs and keyboard navigation
 */
export const FocusManager = {
    /**
     * The element that had focus before a modal was opened
     */
    previouslyFocusedElement: null,

    /**
     * Initialize focus management for modal dialogs
     */
    initialize() {
        // Set up focus management for the help modal
        const helpModal = document.getElementById('help_modal');
        const helpButton = document.querySelector('button[aria-label="How to use"]');
        const closeButton = helpModal.querySelector('button[aria-label="Close help modal"]');
        
        // Store previously focused element when modal opens
        helpButton.addEventListener('click', () => {
            this.previouslyFocusedElement = document.activeElement;
            
            // Set a small timeout to ensure the modal is visible before focusing
            setTimeout(() => {
                closeButton.focus();
            }, 50);
        });
        
        // Return focus when modal closes
        helpModal.addEventListener('close', () => {
            if (this.previouslyFocusedElement) {
                this.previouslyFocusedElement.focus();
            }
        });
        
        // Trap focus within the modal
        helpModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                helpModal.close();
                return;
            }
            
            if (e.key !== 'Tab') return;
            
            // Get all focusable elements in the modal
            const focusableElements = helpModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            // If shift+tab on first element, move to last element
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } 
            // If tab on last element, move to first element
            else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        });
    },
    
    /**
     * Focus the first element in the response area
     */
    focusResponseArea() {
        const continueLink = document.getElementById('continue-link');
        if (continueLink) {
            continueLink.focus();
        }
    }
}; 