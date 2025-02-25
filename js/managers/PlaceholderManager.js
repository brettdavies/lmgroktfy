/**
 * Manages the animated placeholder text functionality
 * @namespace PlaceholderManager
 */
import { UIState } from './UIState.js';

export const PlaceholderManager = {
    elements: {
        input: null,
        submitButton: null,
        customPlaceholder: null
    },

    placeholders: [
        "grok the meaning of life for me...",
        "grok quantum physics for me...",
        "grok how to make pasta for me...",
        "grok artificial intelligence for me...",
        "grok what does the fox say?",
        "grok when is the next eclipse?"
    ],

    currentIndex: 0,
    rotationInterval: null,
    hasUrlQuestion: false,

    initialize() {
        this.elements.input = document.getElementById('question-input');
        this.elements.submitButton = document.getElementById('submit-button');
        this.elements.customPlaceholder = document.getElementById('custom-placeholder');

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

    updatePlaceholderVisibility(value) {
        const isFocused = document.activeElement === this.elements.input;
        UIState.updatePlaceholderVisibility(value, isFocused, this.hasUrlQuestion);
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
        UIState.addClass(this.elements.input, 'placeholder-hidden');
        
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