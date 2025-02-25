/**
 * Manages focus behavior and keyboard navigation
 * @namespace FocusManager
 */
import { UIState } from './UIState.js';

export const FocusManager = {
    /**
     * Currently focused element
     */
    currentFocusElement: null,
    
    /**
     * Focus trap container
     */
    trapContainer: null,
    
    /**
     * Focusable elements selector
     */
    focusableSelector: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    
    /**
     * Initialize the focus manager
     */
    initialize() {
        // Set up keyboard event listeners
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
        
        // Set initial focus
        this.setInitialFocus();
        
        // Set up focus tracking
        document.addEventListener('focusin', this.trackFocus.bind(this));
        
        // Set up modal focus trapping
        this.setupModalFocusTraps();
    },
    
    /**
     * Set focus to an element
     * @param {HTMLElement} element - The element to focus
     * @param {Object} options - Focus options
     */
    setFocus(element, options = {}) {
        if (!element) return;
        
        // Focus the element
        element.focus(options);
        
        // Add focused class using UIState
        UIState.addClass(element, 'focused');
        
        // Update current focus element
        this.currentFocusElement = element;
        
        // Announce focus change to screen readers if specified
        if (options.announceToScreenReader) {
            this.announceToScreenReader(`Focus is now on ${element.tagName.toLowerCase()}${element.id ? ' ' + element.id : ''}`);
        }
    },
    
    /**
     * Clear focus from an element
     * @param {HTMLElement} element - The element to clear focus from
     */
    clearFocus(element) {
        if (!element) return;
        
        // Remove focus
        element.blur();
        
        // Remove focused class using UIState
        UIState.removeClass(element, 'focused');
        
        // Clear current focus element if it matches
        if (this.currentFocusElement === element) {
            this.currentFocusElement = null;
        }
    },
    
    /**
     * Set initial focus on page load
     */
    setInitialFocus() {
        // Focus the question input if it exists
        const questionInput = UIState.elements.question();
        if (questionInput) {
            // Use setTimeout to ensure DOM is fully loaded
            setTimeout(() => {
                this.setFocus(questionInput);
            }, 100);
        }
    },
    
    /**
     * Track focus changes
     * @param {Event} event - The focus event
     */
    trackFocus(event) {
        this.currentFocusElement = event.target;
        
        // Remove focused class from all elements
        document.querySelectorAll('.focused').forEach(el => {
            if (el !== event.target) {
                UIState.removeClass(el, 'focused');
            }
        });
        
        // Add focused class to current element
        UIState.addClass(event.target, 'focused');
    },
    
    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyboardNavigation(event) {
        // Handle Escape key
        if (event.key === 'Escape') {
            this.handleEscapeKey();
        }
        
        // Handle Tab key for focus trapping
        if (event.key === 'Tab' && this.trapContainer) {
            this.handleTabKeyInTrap(event);
        }
        
        // Handle arrow keys for navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            this.handleArrowKeys(event);
        }
        
        // Handle Enter key on buttons and links
        if (event.key === 'Enter' && document.activeElement) {
            const activeElement = document.activeElement;
            if (activeElement.tagName === 'BUTTON' || 
                (activeElement.tagName === 'A' && activeElement.hasAttribute('href'))) {
                activeElement.click();
            }
        }
    },
    
    /**
     * Handle Escape key press
     */
    handleEscapeKey() {
        // Close any open modals
        const openModal = document.querySelector('.modal.active, dialog[open], [role="dialog"].active');
        if (openModal) {
            // Use UIState to hide the modal
            UIState.removeClass(openModal, 'active');
            if (openModal.tagName === 'DIALOG') {
                openModal.close();
            } else {
                UIState.hide(openModal);
            }
            
            // Release focus trap
            this.releaseFocusTrap();
            
            // Return focus to the element that opened the modal
            const returnFocusTo = openModal.dataset.returnFocusTo;
            if (returnFocusTo) {
                const element = document.getElementById(returnFocusTo);
                if (element) {
                    this.setFocus(element);
                }
            }
            
            // Announce modal closed to screen readers
            this.announceToScreenReader('Dialog closed');
        }
    },
    
    /**
     * Handle Tab key in focus trap
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleTabKeyInTrap(event) {
        if (!this.trapContainer) return;
        
        // Get all focusable elements in the trap container
        const focusableElements = this.getFocusableElements(this.trapContainer);
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Handle Tab and Shift+Tab to create a focus loop
        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            this.setFocus(lastElement);
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            this.setFocus(firstElement);
        }
    },
    
    /**
     * Handle arrow keys for navigation
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleArrowKeys(event) {
        // Only handle arrow keys in specific contexts
        const activeElement = document.activeElement;
        
        // Skip if in an input, textarea, or select
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
            return;
        }
        
        // Handle arrow keys in a list context
        if (activeElement.closest('[role="listbox"], [role="menu"], [role="tablist"], ul, ol')) {
            this.handleListNavigation(event);
        }
    },
    
    /**
     * Handle arrow key navigation in lists
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleListNavigation(event) {
        const activeElement = document.activeElement;
        const list = activeElement.closest('[role="listbox"], [role="menu"], [role="tablist"], ul, ol');
        if (!list) return;
        
        const items = Array.from(list.querySelectorAll(this.focusableSelector));
        const currentIndex = items.indexOf(activeElement);
        
        if (currentIndex === -1) return;
        
        let nextIndex;
        
        // Determine next index based on key
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                nextIndex = (currentIndex + 1) % items.length;
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                nextIndex = (currentIndex - 1 + items.length) % items.length;
                break;
            default:
                return;
        }
        
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        // Focus the next item
        this.setFocus(items[nextIndex]);
    },
    
    /**
     * Set up a focus trap within a container
     * @param {HTMLElement} container - The container to trap focus within
     */
    trapFocus(container) {
        if (!container) return;
        
        // Store the trap container
        this.trapContainer = container;
        
        // Store the element that had focus before trapping
        this.previousFocusElement = document.activeElement;
        
        // Get all focusable elements in the container
        const focusableElements = this.getFocusableElements(container);
        
        // If there are focusable elements, focus the first one
        if (focusableElements.length > 0) {
            this.setFocus(focusableElements[0]);
        }
        
        // Set data attribute for returning focus
        if (this.previousFocusElement && this.previousFocusElement.id) {
            UIState.setAttribute(container, 'data-return-focus-to', this.previousFocusElement.id);
        }
        
        // Announce to screen readers
        this.announceToScreenReader('Dialog opened. Press Escape to close.');
    },
    
    /**
     * Release the focus trap
     */
    releaseFocusTrap() {
        // Return focus to the previous element
        if (this.previousFocusElement) {
            this.setFocus(this.previousFocusElement);
        }
        
        // Clear the trap container
        this.trapContainer = null;
    },
    
    /**
     * Set up focus traps for all modals
     */
    setupModalFocusTraps() {
        // Handle dialog open events
        document.addEventListener('click', (event) => {
            // Check if the clicked element opens a modal
            const modalTrigger = event.target.closest('[data-opens-modal]');
            if (!modalTrigger) return;
            
            const modalId = modalTrigger.dataset.opensModal;
            const modal = document.getElementById(modalId);
            
            if (modal) {
                // Show the modal using UIState
                if (modal.tagName === 'DIALOG') {
                    modal.showModal();
                } else {
                    UIState.show(modal);
                    UIState.addClass(modal, 'active');
                }
                
                // Trap focus in the modal
                this.trapFocus(modal);
            }
        });
    },
    
    /**
     * Get all focusable elements within a container
     * @param {HTMLElement} container - The container to search within
     * @returns {Array} Array of focusable elements
     */
    getFocusableElements(container) {
        if (!container) return [];
        
        return Array.from(container.querySelectorAll(this.focusableSelector))
            .filter(el => !el.disabled && el.offsetParent !== null); // Filter out disabled and hidden elements
    },
    
    /**
     * Announce a message to screen readers
     * @param {string} message - The message to announce
     */
    announceToScreenReader(message) {
        // Get or create the screen reader announcer
        let announcer = document.getElementById('sr-announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            UIState.setAttribute(announcer, 'id', 'sr-announcer');
            UIState.setAttribute(announcer, 'aria-live', 'polite');
            UIState.setAttribute(announcer, 'aria-atomic', 'true');
            UIState.setStyle(announcer, 'position', 'absolute');
            UIState.setStyle(announcer, 'width', '1px');
            UIState.setStyle(announcer, 'height', '1px');
            UIState.setStyle(announcer, 'padding', '0');
            UIState.setStyle(announcer, 'overflow', 'hidden');
            UIState.setStyle(announcer, 'clip', 'rect(0, 0, 0, 0)');
            UIState.setStyle(announcer, 'white-space', 'nowrap');
            UIState.setStyle(announcer, 'border', '0');
            document.body.appendChild(announcer);
        }
        
        // Set the message
        UIState.setText(announcer, message);
    }
}; 