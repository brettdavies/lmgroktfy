/**
 * Manages the animated placeholder text functionality
 * @namespace PlaceholderManager
 */
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
            this.elements.customPlaceholder.style.opacity = '0';
            this.elements.input.classList.remove('placeholder-hidden');
        }

        this.setupEventListeners();
        this.initialSetup();
        
        // Only start rotation if there's no URL question
        if (!this.hasUrlQuestion) {
            this.startRotation();
        }
    },

    updatePlaceholderVisibility(value) {
        // If we have a URL question, always keep placeholder hidden
        if (this.hasUrlQuestion) {
            this.elements.customPlaceholder.style.opacity = '0';
            this.elements.input.classList.remove('placeholder-hidden');
            return;
        }

        const isEmpty = !value.trim();
        const isFocused = document.activeElement === this.elements.input;
        
        // Only show custom placeholder when empty and not focused
        this.elements.customPlaceholder.style.opacity = isEmpty && !isFocused ? '1' : '0';
        
        // Toggle native placeholder visibility
        this.elements.input.classList.toggle('placeholder-hidden', isEmpty && !isFocused);
        
        // Update submit button state
        this.elements.submitButton.disabled = isEmpty;
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
        this.elements.customPlaceholder.classList.remove('animate');
        // Trigger reflow to restart animation
        void this.elements.customPlaceholder.offsetWidth;
        this.elements.customPlaceholder.classList.add('animate');
        this.elements.customPlaceholder.textContent = this.placeholders[this.currentIndex];
        this.elements.input.placeholder = this.placeholders[this.currentIndex];
    },

    initialSetup() {
        if (!this.hasUrlQuestion) {
            this.elements.customPlaceholder.textContent = this.placeholders[0];
        }
    },

    startRotation() {
        this.rotationInterval = setInterval(() => this.updatePlaceholder(), 3000);
    },

    cleanup() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
        }
    }
}; 