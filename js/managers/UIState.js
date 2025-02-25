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
 * Manages the UI state and DOM manipulations for the application.
 * This is the central module for all UI-related operations.
 * 
 * Design Principles:
 * 1. Centralization - All DOM manipulations go through this module
 * 2. Standardization - Consistent patterns for state transitions
 * 3. Separation of Concerns - Business logic components delegate UI updates here
 * 
 * @namespace UIState
 */
export const UIState = {
    /**
     * Collection of getter functions for DOM elements.
     * Always use these getters instead of direct document.getElementById calls.
     * This allows for easier testing and centralized element references.
     * 
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
        customPlaceholder: () => document.getElementById('custom-placeholder'),
        submitButton: () => document.getElementById('submit-button'),
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
     * Shows an element by removing the 'hidden' class.
     * This is the standard way to make elements visible in the application.
     * 
     * @param {HTMLElement} element - The element to show
     * @example
     * // Show the question form
     * UIState.show(UIState.elements.questionForm());
     */
    show(element) {
        if (element) element.classList.remove('hidden');
    },
    
    /**
     * Hides an element by adding the 'hidden' class.
     * This is the standard way to make elements invisible in the application.
     * 
     * @param {HTMLElement} element - The element to hide
     * @example
     * // Hide the loading indicator
     * UIState.hide(UIState.elements.loading());
     */
    hide(element) {
        if (element) element.classList.add('hidden');
    },
    
    /**
     * Sets the opacity of an element.
     * Used for fade effects and visibility that doesn't affect layout.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {number} value - Opacity value (0-1)
     * @example
     * // Make an element semi-transparent
     * UIState.setOpacity(UIState.elements.customPlaceholder(), 0.5);
     */
    setOpacity(element, value) {
        if (element) element.style.opacity = value.toString();
    },
    
    /**
     * Enables a button by removing the disabled attribute.
     * 
     * @param {HTMLElement} button - The button to enable
     * @example
     * // Enable the submit button
     * UIState.enableButton(UIState.elements.submitButton());
     */
    enableButton(button) {
        if (button) button.disabled = false;
    },
    
    /**
     * Disables a button by adding the disabled attribute.
     * 
     * @param {HTMLElement} button - The button to disable
     * @example
     * // Disable the submit button
     * UIState.disableButton(UIState.elements.submitButton());
     */
    disableButton(button) {
        if (button) button.disabled = true;
    },
    
    /**
     * Sets the submit button state.
     * Centralized method to enable/disable the main submit button.
     * 
     * @param {boolean} isEnabled - Whether the button should be enabled
     * @example
     * // Enable the submit button
     * UIState.setSubmitButtonState(true);
     */
    setSubmitButtonState(isEnabled) {
        const button = this.elements.submitButton();
        console.log(`[UIState] setSubmitButtonState called with isEnabled=${isEnabled}, button=${button ? 'found' : 'not found'}`);
        
        if (button) {
            // Force a small delay to ensure DOM updates properly
            setTimeout(() => {
                button.disabled = !isEnabled;
                
                // Add visual indicator for debugging
                if (isEnabled) {
                    button.classList.add('debug-enabled');
                    button.classList.remove('debug-disabled');
                } else {
                    button.classList.add('debug-disabled');
                    button.classList.remove('debug-enabled');
                }
                
                console.log(`[UIState] Button disabled state set to ${button.disabled}, isEnabled=${isEnabled}`);
            }, 10);
        }
    },
    
    /**
     * Shows the question form.
     * Part of the standard UI state transitions.
     * 
     * @example
     * // Show the question form
     * UIState.showQuestionForm();
     */
    showQuestionForm() {
        this.show(this.elements.questionForm());
    },
    
    /**
     * Hides the question form.
     * Part of the standard UI state transitions.
     * 
     * @example
     * // Hide the question form
     * UIState.hideQuestionForm();
     */
    hideQuestionForm() {
        this.hide(this.elements.questionForm());
    },
    
    /**
     * Shows the response container.
     * Part of the standard UI state transitions.
     * 
     * @example
     * // Show the response container
     * UIState.showResponse();
     */
    showResponse() {
        this.show(this.elements.response());
    },
    
    /**
     * Hides the response container.
     * Part of the standard UI state transitions.
     * 
     * @example
     * // Hide the response container
     * UIState.hideResponse();
     */
    hideResponse() {
        this.hide(this.elements.response());
    },
    
    /**
     * Comprehensive reset of all UI elements to their default state.
     * 
     * @example
     * // Reset the UI to initial state
     * UIState.resetUI();
     */
    resetUI() {
        // Reset form fields
        const questionInput = this.elements.question();
        if (questionInput) questionInput.value = '';
        
        const answerElement = this.elements.answer();
        if (answerElement) answerElement.innerText = '';
        
        // Reset visibility
        this.hideResponse();
        this.showQuestionForm();
        this.hideAllButtons();
        
        // Reset submit button
        this.setSubmitButtonState(false);
        
        // Update URL
        window.history.pushState({}, '', '/');
        
        // Set focus to the question input for better UX
        // Use setTimeout to ensure DOM updates are complete
        setTimeout(() => {
            const questionInput = this.elements.question();
            if (questionInput && typeof FocusManager !== 'undefined' && FocusManager.setFocus) {
                FocusManager.setFocus(questionInput);
                console.log('[UIState] Focus set to question input after reset');
            }
        }, 50);
    },
    
    /**
     * Shows the loading state and hides the response container.
     * Standard transition for when an operation is in progress.
     * 
     * @example
     * // Show loading state
     * UIState.showLoading();
     */
    showLoading() {
        this.show(this.elements.loading());
        this.hideResponse();
    },

    /**
     * Hides the loading state.
     * Called when an operation completes.
     * 
     * @example
     * // Hide loading state
     * UIState.hideLoading();
     */
    hideLoading() {
        this.hide(this.elements.loading());
    },

    /**
     * Shows error state and hides all action buttons.
     * Standard transition for when an operation fails.
     * 
     * @param {string} [question] - The question that failed
     * @example
     * // Show error state
     * UIState.showError('What is the meaning of life?');
     */
    showError(question) {
        this.hideQuestionForm();
        
        const questionDisplay = this.elements.questionDisplay();
        if (questionDisplay && question) {
            questionDisplay.innerText = question;
        }
        
        const answerElement = this.elements.answer();
        if (answerElement) {
            answerElement.innerText = 'Oops, something went wrong!';
        }
        
        this.hideAllButtons();
        this.showResponse();
    },

    /**
     * Shows success state with answer and updates all necessary UI elements.
     * Standard transition for when an operation succeeds.
     * 
     * @param {string} answer - The answer text to display
     * @param {string} question - The question for updating Grok buttons
     * @example
     * // Show success state
     * UIState.showSuccess('42', 'What is the meaning of life?');
     */
    showSuccess(answer, question) {
        this.hideQuestionForm();
        
        const questionDisplay = this.elements.questionDisplay();
        if (questionDisplay) {
            questionDisplay.innerText = question;
        }
        
        const answerElement = this.elements.answer();
        if (answerElement) {
            answerElement.innerText = answer;
        }
        
        this.updateGrokButtons(question);
        this.showAllButtons();
        this.showResponse();
    },

    /**
     * Hides all action buttons.
     * Used in error states or when buttons should not be available.
     * 
     * @example
     * // Hide all action buttons
     * UIState.hideAllButtons();
     */
    hideAllButtons() {
        Object.values(this.elements.buttons).forEach(btn => {
            const element = btn();
            if (element) element.classList.add('hidden');
        });
    },

    /**
     * Shows all action buttons.
     * Used in success states when all actions should be available.
     * 
     * @example
     * // Show all action buttons
     * UIState.showAllButtons();
     */
    showAllButtons() {
        Object.values(this.elements.buttons).forEach(btn => {
            const element = btn();
            if (element) element.classList.remove('hidden');
        });
    },

    /**
     * Updates Grok-related button URLs with the current question.
     * Ensures consistent URL formatting for external links.
     * 
     * @param {string} question - The question to encode in the URLs
     * @example
     * // Update Grok button URLs
     * UIState.updateGrokButtons('What is the meaning of life?');
     */
    updateGrokButtons(question) {
        const continueLink = this.elements.buttons.continueLink();
        if (continueLink) {
            continueLink.href = `https://grok.com/?q=${question}&utm_source=lmgroktfy`;
        }
        
        const useGrokButton = this.elements.buttons.useGrok();
        if (useGrokButton) {
            useGrokButton.href = `https://x.com/i/grok?text=${question}&utm_source=lmgroktfy`;
        }
    },

    /**
     * Shows a toast notification with the specified message.
     * Standard way to show temporary feedback to the user.
     * 
     * @param {string} message - The message to display in the toast
     * @example
     * // Show a toast notification
     * UIState.showToast('Link copied to clipboard!');
     */
    showToast(message) {
        const toast = this.elements.toast();
        const toastMessage = this.elements.toastMessage();
        
        if (toastMessage) {
        toastMessage.textContent = message;
        }
        
        if (toast) {
            this.show(toast);
            setTimeout(() => this.hide(toast), 3000);
        }
    },
    
    /**
     * Updates the placeholder visibility based on input value and focus state.
     * Handles the complex logic of when to show/hide the custom placeholder.
     * 
     * @param {string} value - The current input value
     * @param {boolean} isFocused - Whether the input is focused
     * @param {boolean} hasUrlQuestion - Whether there's a URL-based question
     * @example
     * // Update placeholder visibility
     * UIState.updatePlaceholderVisibility('', false, false);
     */
    updatePlaceholderVisibility(value, isFocused, hasUrlQuestion) {
        const customPlaceholder = this.elements.customPlaceholder();
        const questionInput = this.elements.question();
        
        if (!customPlaceholder || !questionInput) return;
        
        // If we have a URL question, always keep placeholder hidden
        if (hasUrlQuestion) {
            this.setOpacity(customPlaceholder, 0);
            questionInput.classList.remove('placeholder-hidden');
            return;
        }

        const isEmpty = !value.trim();
        
        // Only show custom placeholder when empty and not focused
        this.setOpacity(customPlaceholder, isEmpty && !isFocused ? 1 : 0);
        
        // Toggle native placeholder visibility
        if (isEmpty && !isFocused) {
            questionInput.classList.add('placeholder-hidden');
        } else {
            questionInput.classList.remove('placeholder-hidden');
        }
        
        // Update submit button state
        this.setSubmitButtonState(!isEmpty);
    },

    /**
     * Sets the text content of an element.
     * Centralized method for updating text content.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} text - The text to set
     * @example
     * // Set text content
     * UIState.setText(UIState.elements.answer(), 'The answer is 42');
     */
    setText(element, text) {
        if (element) element.textContent = text;
    },

    /**
     * Sets the HTML content of an element.
     * Use with caution and only with sanitized content.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} html - The HTML content to set
     * @example
     * // Set HTML content
     * UIState.setHtml(UIState.elements.answer(), '<em>The answer is 42</em>');
     */
    setHtml(element, html) {
        if (element) element.innerHTML = html;
    },

    /**
     * Adds a class to an element.
     * Centralized method for adding CSS classes.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} className - The class to add
     * @example
     * // Add a class
     * UIState.addClass(UIState.elements.question(), 'highlighted');
     */
    addClass(element, className) {
        if (element) element.classList.add(className);
    },

    /**
     * Removes a class from an element.
     * Centralized method for removing CSS classes.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} className - The class to remove
     * @example
     * // Remove a class
     * UIState.removeClass(UIState.elements.question(), 'highlighted');
     */
    removeClass(element, className) {
        if (element) element.classList.remove(className);
    },

    /**
     * Toggles a class on an element.
     * Centralized method for toggling CSS classes.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} className - The class to toggle
     * @param {boolean} [force] - Force add or remove
     * @example
     * // Toggle a class
     * UIState.toggleClass(UIState.elements.question(), 'highlighted');
     * // Force add a class
     * UIState.toggleClass(UIState.elements.question(), 'highlighted', true);
     */
    toggleClass(element, className, force) {
        if (element) element.classList.toggle(className, force);
    },

    /**
     * Sets an attribute on an element.
     * Centralized method for setting attributes.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} name - The attribute name
     * @param {string} value - The attribute value
     * @example
     * // Set an attribute
     * UIState.setAttribute(UIState.elements.question(), 'aria-label', 'Enter your question');
     */
    setAttribute(element, name, value) {
        if (element) element.setAttribute(name, value);
    },

    /**
     * Removes an attribute from an element.
     * Centralized method for removing attributes.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} name - The attribute name
     * @example
     * // Remove an attribute
     * UIState.removeAttribute(UIState.elements.question(), 'disabled');
     */
    removeAttribute(element, name) {
        if (element) element.removeAttribute(name);
    },

    /**
     * Sets a style property on an element.
     * Centralized method for setting style properties.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} property - The style property
     * @param {string} value - The style value
     * @example
     * // Set a style property
     * UIState.setStyle(UIState.elements.question(), 'color', 'red');
     */
    setStyle(element, property, value) {
        if (element) element.style[property] = value;
    },

    /**
     * Manages device-specific UI adjustments.
     * Applies appropriate styles based on viewport size.
     * 
     * @param {boolean} isMobile - Whether the current view is mobile
     * @example
     * // Adjust UI for mobile
     * UIState.adjustForViewport(window.innerWidth < 768);
     */
    adjustForViewport(isMobile) {
        const elements = this.elements;
        
        if (isMobile) {
            // Apply mobile-specific adjustments
            this.setMobileLayout();
        } else {
            // Apply desktop-specific adjustments
            this.setDesktopLayout();
        }
    },

    /**
     * Sets UI elements for mobile layout.
     * Applies mobile-specific classes and styles.
     * 
     * @example
     * // Set mobile layout
     * UIState.setMobileLayout();
     */
    setMobileLayout() {
        // Adjust button sizes for touch targets
        Object.values(this.elements.buttons).forEach(btnFn => {
            const btn = btnFn();
            if (btn) this.addClass(btn, 'touch-target');
        });
        
        // Adjust input for mobile keyboards
        const questionInput = this.elements.question();
        if (questionInput) {
            this.addClass(questionInput, 'mobile-input');
        }
        
        // Add mobile class to body for global styling
        this.addClass(document.body, 'mobile-view');
    },

    /**
     * Sets UI elements for desktop layout.
     * Removes mobile-specific classes and styles.
     * 
     * @example
     * // Set desktop layout
     * UIState.setDesktopLayout();
     */
    setDesktopLayout() {
        // Remove mobile-specific classes
        Object.values(this.elements.buttons).forEach(btnFn => {
            const btn = btnFn();
            if (btn) this.removeClass(btn, 'touch-target');
        });
        
        const questionInput = this.elements.question();
        if (questionInput) {
            this.removeClass(questionInput, 'mobile-input');
        }
        
        // Remove mobile class from body
        this.removeClass(document.body, 'mobile-view');
    },

    /**
     * Detects viewport changes and updates UI accordingly.
     * Sets up responsive behavior.
     * 
     * @example
     * // Initialize viewport handling
     * UIState.initViewportHandling();
     */
    initViewportHandling() {
        // Initial check
        this.checkViewport();
        
        // Listen for resize events
        window.addEventListener('resize', () => {
            this.checkViewport();
        });
    },

    /**
     * Checks current viewport and adjusts UI.
     * Called on initialization and resize.
     * 
     * @example
     * // Check viewport and adjust UI
     * UIState.checkViewport();
     */
    checkViewport() {
        const isMobile = window.innerWidth < 768; // Standard mobile breakpoint
        this.adjustForViewport(isMobile);
    },

    /**
     * Enhances an element for touch interaction.
     * Improves mobile experience.
     * 
     * @param {HTMLElement} element - The element to enhance
     * @example
     * // Enhance element for touch
     * UIState.enhanceForTouch(UIState.elements.submitButton());
     */
    enhanceForTouch(element) {
        if (!element) return;
        
        // Prevent double-tap zoom on mobile
        this.setStyle(element, 'touchAction', 'manipulation');
        
        // Add appropriate touch feedback
        this.addClass(element, 'active:bg-opacity-70');
        this.addClass(element, 'transition-transform');
        this.addClass(element, 'active:scale-95');
    },

    /**
     * Sets an ARIA attribute on an element.
     * Centralized method for setting ARIA attributes.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} name - The ARIA attribute name (without 'aria-' prefix)
     * @param {string} value - The attribute value
     * @example
     * // Set aria-label attribute
     * UIState.setAriaAttribute(UIState.elements.question(), 'label', 'Enter your question');
     */
    setAriaAttribute(element, name, value) {
        if (!element) return;
        element.setAttribute(`aria-${name}`, value);
    },

    /**
     * Removes an ARIA attribute from an element.
     * Centralized method for removing ARIA attributes.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string} name - The ARIA attribute name (without 'aria-' prefix)
     * @example
     * // Remove aria-disabled attribute
     * UIState.removeAriaAttribute(UIState.elements.submitButton(), 'disabled');
     */
    removeAriaAttribute(element, name) {
        if (!element) return;
        element.removeAttribute(`aria-${name}`);
    },

    /**
     * Gets the screen reader announcer element.
     * Creates it if it doesn't exist.
     * 
     * @returns {HTMLElement} The screen reader announcer element
     * @private
     */
    _getScreenReaderAnnouncer() {
        let announcer = document.getElementById('sr-announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            this.setAttribute(announcer, 'id', 'sr-announcer');
            this.setAriaAttribute(announcer, 'live', 'polite');
            this.setAriaAttribute(announcer, 'atomic', 'true');
            this.setStyle(announcer, 'position', 'absolute');
            this.setStyle(announcer, 'width', '1px');
            this.setStyle(announcer, 'height', '1px');
            this.setStyle(announcer, 'padding', '0');
            this.setStyle(announcer, 'overflow', 'hidden');
            this.setStyle(announcer, 'clip', 'rect(0, 0, 0, 0)');
            this.setStyle(announcer, 'white-space', 'nowrap');
            this.setStyle(announcer, 'border', '0');
            document.body.appendChild(announcer);
        }
        
        return announcer;
    },

    /**
     * Announces a message to screen readers.
     * Uses an ARIA live region for accessibility.
     * 
     * @param {string} message - The message to announce
     * @param {string} [priority='polite'] - The announcement priority ('polite' or 'assertive')
     * @example
     * // Announce a message politely
     * UIState.announceToScreenReader('Question submitted');
     * 
     * // Announce a message assertively
     * UIState.announceToScreenReader('Error occurred', 'assertive');
     */
    announceToScreenReader(message, priority = 'polite') {
        const announcer = this._getScreenReaderAnnouncer();
        
        // Set the priority
        this.setAriaAttribute(announcer, 'live', priority);
        
        // Clear the announcer first (helps with repeated announcements)
        this.setText(announcer, '');
        
        // Use setTimeout to ensure the clear takes effect
        setTimeout(() => {
            this.setText(announcer, message);
        }, 50);
    },

    /**
     * Sets the accessible name of an element.
     * Uses aria-label or aria-labelledby as appropriate.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string|HTMLElement} labelOrId - The label text or element ID
     * @param {boolean} [useElementReference=false] - Whether to use element reference (aria-labelledby) instead of direct text (aria-label)
     * @example
     * // Set aria-label
     * UIState.setAccessibleName(UIState.elements.submitButton(), 'Submit question');
     * 
     * // Set aria-labelledby
     * UIState.setAccessibleName(UIState.elements.submitButton(), 'question-label', true);
     */
    setAccessibleName(element, labelOrId, useElementReference = false) {
        if (!element) return;
        
        if (useElementReference) {
            this.setAriaAttribute(element, 'labelledby', labelOrId);
            this.removeAriaAttribute(element, 'label');
        } else {
            this.setAriaAttribute(element, 'label', labelOrId);
            this.removeAriaAttribute(element, 'labelledby');
        }
    },

    /**
     * Sets the accessible description of an element.
     * Uses aria-describedby or aria-description as appropriate.
     * 
     * @param {HTMLElement} element - The element to modify
     * @param {string|HTMLElement} descriptionOrId - The description text or element ID
     * @param {boolean} [useElementReference=false] - Whether to use element reference (aria-describedby) instead of direct text (aria-description)
     * @example
     * // Set aria-description
     * UIState.setAccessibleDescription(UIState.elements.submitButton(), 'Submits your question to Grok');
     * 
     * // Set aria-describedby
     * UIState.setAccessibleDescription(UIState.elements.submitButton(), 'submit-description', true);
     */
    setAccessibleDescription(element, descriptionOrId, useElementReference = false) {
        if (!element) return;
        
        if (useElementReference) {
            this.setAriaAttribute(element, 'describedby', descriptionOrId);
            this.removeAriaAttribute(element, 'description');
        } else {
            this.setAriaAttribute(element, 'description', descriptionOrId);
            this.removeAriaAttribute(element, 'describedby');
        }
    },

    /**
     * Updates the loading state with appropriate ARIA attributes.
     * Enhances the standard showLoading method with accessibility.
     * 
     * @param {string} [loadingMessage='Loading...'] - The loading message for screen readers
     * @example
     * // Show loading state with default message
     * UIState.showAccessibleLoading();
     * 
     * // Show loading state with custom message
     * UIState.showAccessibleLoading('Fetching answer from Grok...');
     */
    showAccessibleLoading(loadingMessage = 'Loading...') {
        // Show loading using standard method
        this.showLoading();
        
        // Add accessibility enhancements
        const loading = this.elements.loading();
        if (loading) {
            this.setAriaAttribute(loading, 'busy', 'true');
            this.setAriaAttribute(loading, 'live', 'polite');
            this.setText(loading, loadingMessage);
        }
        
        // Announce to screen readers
        this.announceToScreenReader(loadingMessage);
    },

    /**
     * Updates the error state with appropriate ARIA attributes.
     * Enhances the standard showError method with accessibility.
     * 
     * @param {string} question - The question that failed
     * @param {string} [errorMessage='Oops, something went wrong!'] - The error message
     * @example
     * // Show error state with default message
     * UIState.showAccessibleError('What is the meaning of life?');
     * 
     * // Show error state with custom message
     * UIState.showAccessibleError('What is the meaning of life?', 'Failed to connect to Grok');
     */
    showAccessibleError(question, errorMessage = 'Oops, something went wrong!') {
        // Show error using standard method
        this.showError(question);
        
        // Add accessibility enhancements
        const answer = this.elements.answer();
        if (answer) {
            this.setAriaAttribute(answer, 'live', 'assertive');
            this.setText(answer, errorMessage);
        }
        
        // Announce to screen readers
        this.announceToScreenReader(errorMessage, 'assertive');
    },

    /**
     * Updates the success state with appropriate ARIA attributes.
     * Enhances the standard showSuccess method with accessibility.
     * 
     * @param {string} answer - The answer text to display
     * @param {string} question - The question for updating Grok buttons
     * @example
     * // Show success state
     * UIState.showAccessibleSuccess('42', 'What is the meaning of life?');
     */
    showAccessibleSuccess(answer, question) {
        // Show success using standard method
        this.showSuccess(answer, question);
        
        // Add accessibility enhancements
        const answerElement = this.elements.answer();
        if (answerElement) {
            this.setAriaAttribute(answerElement, 'live', 'polite');
        }
        
        // Announce to screen readers
        this.announceToScreenReader('Answer received');
    }
}; 