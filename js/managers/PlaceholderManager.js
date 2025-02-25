/**
 * Manages the animated placeholder text functionality
 * @namespace PlaceholderManager
 */
import { UIState } from './UIState.js';
import i18n from '../i18n/i18n.js';

export const PlaceholderManager = {
    elements: {
        input: null,
        submitButton: null,
        customPlaceholder: null
    },

    // Placeholders will be loaded from i18n
    placeholders: [],

    currentIndex: 0,
    rotationInterval: null,
    hasUrlQuestion: false,

    initialize() {
        this.elements.input = document.getElementById('question-input');
        this.elements.submitButton = document.getElementById('submit-button');
        this.elements.customPlaceholder = document.getElementById('custom-placeholder');

        // Load placeholders from current language
        this.loadPlaceholders();

        // Listen for language changes to update placeholders
        window.addEventListener('languageChanged', () => {
            this.loadPlaceholders();
            this.updatePlaceholder();
        });

        // Check if there's a URL-based question
        const path = window.location.pathname;
        this.hasUrlQuestion = path && path !== '/' && path !== '/index.html';

        // If there's a URL question, hide placeholder immediately
        if (this.hasUrlQuestion) {
            UIState.setOpacity(this.elements.customPlaceholder, 0);
            UIState.removeClass(this.elements.input, 'placeholder-hidden');
        }

        this.setupEventListeners();
        this.initialSetup();
        
        // Only start rotation if there's no URL question
        if (!this.hasUrlQuestion) {
            this.startRotation();
        }
        
        // Initialize mobile-specific adjustments
        this.initMobileSupport();
    },

    /**
     * Load placeholders from the current language
     */
    loadPlaceholders() {
        // Get placeholders from i18n
        const localizedPlaceholders = i18n.t('main.placeholders');
        
        // If we have localized placeholders, use them
        if (localizedPlaceholders && Array.isArray(localizedPlaceholders)) {
            this.placeholders = localizedPlaceholders;
        } else {
            // Fallback to a default placeholder if translation is missing
            this.placeholders = [i18n.t('main.placeholder')];
        }
        
        // Reset index if it's out of bounds with the new array
        if (this.currentIndex >= this.placeholders.length) {
            this.currentIndex = 0;
        }
    },

    updatePlaceholderVisibility(inputValue) {
        const placeholder = this.elements.customPlaceholder;
        
        if (!placeholder) {
            console.warn('[PlaceholderManager] Placeholder element not found');
            return;
        }
        
        // Check if input has value
        if (inputValue && inputValue.trim().length > 0) {
            // Hide placeholder when input has value
            UIState.addClass(placeholder, 'opacity-0');
            UIState.addClass(placeholder, 'invisible');
        } else {
            // Show placeholder when input is empty
            UIState.removeClass(placeholder, 'opacity-0');
            UIState.removeClass(placeholder, 'invisible');
            
            // Check for RTL direction and adjust placeholder position if needed
            const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
            
            // Remove both positioning classes first
            UIState.removeClass(placeholder, 'left-6');
            UIState.removeClass(placeholder, 'right-6');
            
            // Then add the appropriate one based on direction
            if (isRTL) {
                UIState.addClass(placeholder, 'right-6');
                // Ensure text alignment is correct for RTL
                UIState.addClass(placeholder, 'text-right');
                // Ensure the native placeholder is hidden
                UIState.addClass(this.elements.input, 'placeholder-hidden');
            } else {
                UIState.addClass(placeholder, 'left-6');
                // Ensure text alignment is correct for LTR
                UIState.removeClass(placeholder, 'text-right');
                // Ensure the native placeholder is hidden
                UIState.addClass(this.elements.input, 'placeholder-hidden');
            }
        }
    },

    setupEventListeners() {
        this.elements.input.addEventListener('input', (e) => {
            this.updatePlaceholderVisibility(e.target.value);
        });

        this.elements.input.addEventListener('focus', () => {
            this.updatePlaceholderVisibility(this.elements.input.value);
        });

        this.elements.input.addEventListener('blur', () => {
            this.updatePlaceholderVisibility(this.elements.input.value);
        });
    },

    updatePlaceholder() {
        if (this.hasUrlQuestion || document.activeElement === this.elements.input || this.elements.input.value) return;
        
        this.currentIndex = (this.currentIndex + 1) % this.placeholders.length;
        UIState.removeClass(this.elements.customPlaceholder, 'animate');
        // Trigger reflow to restart animation
        void this.elements.customPlaceholder.offsetWidth;
        UIState.addClass(this.elements.customPlaceholder, 'animate');
        UIState.setText(this.elements.customPlaceholder, this.placeholders[this.currentIndex]);
        UIState.setAttribute(this.elements.input, 'placeholder', this.placeholders[this.currentIndex]);
    },

    initialSetup() {
        if (!this.hasUrlQuestion) {
            UIState.setText(this.elements.customPlaceholder, this.placeholders[0]);
            
            // Ensure placeholder is visible
            UIState.setOpacity(this.elements.customPlaceholder, 1);
            UIState.removeClass(this.elements.customPlaceholder, 'opacity-0');
            UIState.removeClass(this.elements.customPlaceholder, 'invisible');
            
            // Check for RTL direction and adjust placeholder position if needed
            const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
            if (isRTL) {
                UIState.removeClass(this.elements.customPlaceholder, 'left-6');
                UIState.addClass(this.elements.customPlaceholder, 'right-6');
                UIState.addClass(this.elements.customPlaceholder, 'text-right');
            } else {
                UIState.removeClass(this.elements.customPlaceholder, 'right-6');
                UIState.addClass(this.elements.customPlaceholder, 'left-6');
                UIState.removeClass(this.elements.customPlaceholder, 'text-right');
            }
            
            // Ensure the native placeholder is hidden
            UIState.addClass(this.elements.input, 'placeholder-hidden');
        }
    },

    startRotation() {
        this.rotationInterval = setInterval(() => this.updatePlaceholder(), 3000);
    },

    cleanup() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
        }
    },

    reset() {
        this.hasUrlQuestion = false;
        this.currentIndex = 0;
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
        }
        UIState.setText(this.elements.customPlaceholder, this.placeholders[0]);
        UIState.setAttribute(this.elements.input, 'placeholder', this.placeholders[0]);
        
        // Reset placeholder visibility using UIState
        UIState.setOpacity(this.elements.customPlaceholder, 1);
        UIState.removeClass(this.elements.customPlaceholder, 'opacity-0');
        UIState.removeClass(this.elements.customPlaceholder, 'invisible');
        UIState.addClass(this.elements.input, 'placeholder-hidden');
        
        // Ensure proper positioning based on text direction
        const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
        
        // Remove both positioning classes first
        UIState.removeClass(this.elements.customPlaceholder, 'left-6');
        UIState.removeClass(this.elements.customPlaceholder, 'right-6');
        
        // Then add the appropriate one based on direction
        if (isRTL) {
            UIState.addClass(this.elements.customPlaceholder, 'right-6');
            UIState.addClass(this.elements.customPlaceholder, 'text-right');
        } else {
            UIState.addClass(this.elements.customPlaceholder, 'left-6');
            UIState.removeClass(this.elements.customPlaceholder, 'text-right');
        }
        
        // Reset submit button state using UIState
        UIState.setSubmitButtonState(false);
        
        this.startRotation();
    },
    
    /**
     * Initialize mobile-specific support for placeholders
     */
    initMobileSupport() {
        // Check if we're on a mobile device
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // Enhance input for mobile
            UIState.enhanceForTouch(this.elements.input);
            UIState.enhanceForTouch(this.elements.submitButton);
            
            // Adjust placeholder for mobile
            UIState.addClass(this.elements.customPlaceholder, 'mobile-placeholder');
        }
        
        // Listen for orientation changes
        window.addEventListener('resize', () => {
            const newIsMobile = window.innerWidth < 768;
            
            if (newIsMobile !== isMobile) {
                if (newIsMobile) {
                    UIState.addClass(this.elements.customPlaceholder, 'mobile-placeholder');
                } else {
                    UIState.removeClass(this.elements.customPlaceholder, 'mobile-placeholder');
                }
            }
        });
    }
}; 