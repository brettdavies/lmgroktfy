/**
 * @namespace AnimationManager
 * @description Manages animations and transitions throughout the application.
 * Provides a centralized system for consistent animations.
 */

// Import UIState for DOM manipulation
import { UIState } from './UIState.js';

export const AnimationManager = {
    // Animation durations in milliseconds
    durations: {
        SHORT: 150,
        MEDIUM: 300,
        LONG: 500
    },

    // Animation timing functions
    easings: {
        LINEAR: 'linear',
        EASE: 'ease',
        EASE_IN: 'ease-in',
        EASE_OUT: 'ease-out',
        EASE_IN_OUT: 'ease-in-out'
    },

    // Animation types
    animations: {
        FADE_IN: 'fade-in',
        FADE_OUT: 'fade-out',
        SLIDE_IN: 'slide-in',
        SLIDE_OUT: 'slide-out',
        SCALE_IN: 'scale-in',
        SCALE_OUT: 'scale-out',
        PULSE: 'pulse',
        SHAKE: 'shake',
        BOUNCE: 'bounce'
    },

    // Reduced motion preference tracking
    prefersReducedMotion: false,

    /**
     * Initializes the animation manager.
     * Sets up event listeners and checks user preferences.
     */
    initialize() {
        // Check for reduced motion preference
        this.checkReducedMotionPreference();

        // Listen for changes to reduced motion preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', () => {
            this.checkReducedMotionPreference();
        });

        // Add base animation classes to document
        this.setupAnimationStyles();

        console.log('AnimationManager initialized');
    },

    /**
     * Checks if the user prefers reduced motion.
     * Updates the internal state accordingly.
     */
    checkReducedMotionPreference() {
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        console.log(`Reduced motion preference: ${this.prefersReducedMotion}`);
    },

    /**
     * Sets up animation styles in the document.
     * Adds a style element with all animation definitions.
     * @private
     */
    setupAnimationStyles() {
        // Check if styles are already added
        if (document.getElementById('animation-styles')) {
            return;
        }

        // Create style element
        const styleEl = document.createElement('style');
        
        // Set the ID using UIState
        UIState.setAttribute(styleEl, 'id', 'animation-styles');
        
        // Define animation keyframes and classes
        styleEl.textContent = `
            /* Fade animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            /* Slide animations */
            @keyframes slideInFromRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            
            @keyframes slideOutToRight {
                from { transform: translateX(0); }
                to { transform: translateX(100%); }
            }
            
            @keyframes slideInFromLeft {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
            }
            
            @keyframes slideOutToLeft {
                from { transform: translateX(0); }
                to { transform: translateX(-100%); }
            }
            
            /* Scale animations */
            @keyframes scaleIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            
            @keyframes scaleOut {
                from { transform: scale(1); opacity: 1; }
                to { transform: scale(0.8); opacity: 0; }
            }
            
            /* Effect animations */
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                60% { transform: translateY(-10px); }
            }
            
            /* Animation utility classes */
            .animate-fade-in {
                animation: fadeIn var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-fade-out {
                animation: fadeOut var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-slide-in-right {
                animation: slideInFromRight var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-slide-out-right {
                animation: slideOutToRight var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-slide-in-left {
                animation: slideInFromLeft var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-slide-out-left {
                animation: slideOutToLeft var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-scale-in {
                animation: scaleIn var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-scale-out {
                animation: scaleOut var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-pulse {
                animation: pulse var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-shake {
                animation: shake var(--animation-duration, 300ms) var(--animation-easing, ease) forwards;
            }
            
            .animate-bounce {
                animation: bounce var(--animation-duration, 500ms) var(--animation-easing, ease) forwards;
            }
            
            /* Transition utilities */
            .transition-all {
                transition: all var(--transition-duration, 300ms) var(--transition-easing, ease);
            }
            
            .transition-opacity {
                transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
            }
            
            .transition-transform {
                transition: transform var(--transition-duration, 300ms) var(--transition-easing, ease);
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                *, ::before, ::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                    scroll-behavior: auto !important;
                }
            }
        `;
        
        // Add to document
        document.head.appendChild(styleEl);
    },

    /**
     * Animates an element with the specified animation.
     * 
     * @param {HTMLElement} element - The element to animate
     * @param {string} animationType - The type of animation to apply
     * @param {Object} [options={}] - Animation options
     * @param {number} [options.duration=300] - Animation duration in milliseconds
     * @param {string} [options.easing='ease'] - Animation timing function
     * @param {string} [options.direction='normal'] - Animation direction ('normal', 'reverse')
     * @param {Function} [options.onComplete] - Callback function when animation completes
     * @returns {Promise} A promise that resolves when the animation completes
     * @example
     * // Fade in an element
     * AnimationManager.animate(document.getElementById('myElement'), AnimationManager.animations.FADE_IN);
     * 
     * // Slide in with custom options
     * AnimationManager.animate(element, AnimationManager.animations.SLIDE_IN, {
     *   duration: AnimationManager.durations.LONG,
     *   easing: AnimationManager.easings.EASE_OUT,
     *   onComplete: () => console.log('Animation complete')
     * });
     */
    animate(element, animationType, options = {}) {
        if (!element) return Promise.reject(new Error('Element not found'));
        
        // Skip animations if user prefers reduced motion
        if (this.prefersReducedMotion) {
            if (options.onComplete) {
                options.onComplete();
            }
            return Promise.resolve();
        }
        
        const duration = options.duration || this.durations.MEDIUM;
        const easing = options.easing || this.easings.EASE;
        const direction = options.direction || 'normal';
        
        // Set animation custom properties
        UIState.setStyle(element, '--animation-duration', `${duration}ms`);
        UIState.setStyle(element, '--animation-easing', easing);
        
        // Map animation type to class name
        let className;
        switch (animationType) {
            case this.animations.FADE_IN:
                className = 'animate-fade-in';
                break;
            case this.animations.FADE_OUT:
                className = 'animate-fade-out';
                break;
            case this.animations.SLIDE_IN:
                className = direction === 'reverse' ? 'animate-slide-in-left' : 'animate-slide-in-right';
                break;
            case this.animations.SLIDE_OUT:
                className = direction === 'reverse' ? 'animate-slide-out-left' : 'animate-slide-out-right';
                break;
            case this.animations.SCALE_IN:
                className = 'animate-scale-in';
                break;
            case this.animations.SCALE_OUT:
                className = 'animate-scale-out';
                break;
            case this.animations.PULSE:
                className = 'animate-pulse';
                break;
            case this.animations.SHAKE:
                className = 'animate-shake';
                break;
            case this.animations.BOUNCE:
                className = 'animate-bounce';
                break;
            default:
                return Promise.reject(new Error(`Unknown animation type: ${animationType}`));
        }
        
        // Apply animation class
        UIState.addClass(element, className);
        
        // Return a promise that resolves when animation completes
        return new Promise((resolve) => {
            const handleAnimationEnd = () => {
                UIState.removeClass(element, className);
                element.removeEventListener('animationend', handleAnimationEnd);
                
                if (options.onComplete) {
                    options.onComplete();
                }
                
                resolve();
            };
            
            element.addEventListener('animationend', handleAnimationEnd);
        });
    },

    /**
     * Applies a transition to an element.
     * 
     * @param {HTMLElement} element - The element to transition
     * @param {Object} properties - CSS properties to transition to
     * @param {Object} [options={}] - Transition options
     * @param {number} [options.duration=300] - Transition duration in milliseconds
     * @param {string} [options.easing='ease'] - Transition timing function
     * @param {Function} [options.onComplete] - Callback function when transition completes
     * @returns {Promise} A promise that resolves when the transition completes
     * @example
     * // Fade out an element
     * AnimationManager.transition(element, { opacity: 0 });
     * 
     * // Move and resize with custom options
     * AnimationManager.transition(element, { 
     *   transform: 'translateX(100px)', 
     *   width: '200px' 
     * }, {
     *   duration: AnimationManager.durations.LONG,
     *   easing: AnimationManager.easings.EASE_IN_OUT
     * });
     */
    transition(element, properties, options = {}) {
        if (!element) return Promise.reject(new Error('Element not found'));
        
        // Skip transitions if user prefers reduced motion
        if (this.prefersReducedMotion) {
            // Apply properties immediately without transition
            Object.entries(properties).forEach(([prop, value]) => {
                UIState.setStyle(element, prop, value);
            });
            
            if (options.onComplete) {
                options.onComplete();
            }
            return Promise.resolve();
        }
        
        const duration = options.duration || this.durations.MEDIUM;
        const easing = options.easing || this.easings.EASE;
        
        // Set transition custom properties
        UIState.setStyle(element, '--transition-duration', `${duration}ms`);
        UIState.setStyle(element, '--transition-easing', easing);
        
        // Determine which transition class to use based on properties
        let transitionClass = 'transition-all';
        if (Object.keys(properties).length === 1) {
            if (properties.hasOwnProperty('opacity')) {
                transitionClass = 'transition-opacity';
            } else if (properties.hasOwnProperty('transform')) {
                transitionClass = 'transition-transform';
            }
        }
        
        // Apply transition class
        UIState.addClass(element, transitionClass);
        
        // Return a promise that resolves when transition completes
        return new Promise((resolve) => {
            const handleTransitionEnd = () => {
                UIState.removeClass(element, transitionClass);
                element.removeEventListener('transitionend', handleTransitionEnd);
                
                if (options.onComplete) {
                    options.onComplete();
                }
                
                resolve();
            };
            
            // Apply the property changes to trigger the transition
            requestAnimationFrame(() => {
                Object.entries(properties).forEach(([prop, value]) => {
                    UIState.setStyle(element, prop, value);
                });
                
                // If no transition is triggered, resolve immediately
                if (getComputedStyle(element).transitionDuration === '0s') {
                    handleTransitionEnd();
                } else {
                    element.addEventListener('transitionend', handleTransitionEnd, { once: true });
                    
                    // Safety timeout in case transitionend doesn't fire
                    setTimeout(handleTransitionEnd, duration + 50);
                }
            });
        });
    },

    /**
     * Creates a staggered animation effect for a group of elements.
     * 
     * @param {NodeList|Array} elements - The elements to animate
     * @param {string} animationType - The type of animation to apply
     * @param {Object} [options={}] - Animation options
     * @param {number} [options.duration=300] - Animation duration in milliseconds
     * @param {string} [options.easing='ease'] - Animation timing function
     * @param {number} [options.staggerDelay=50] - Delay between each element's animation in milliseconds
     * @param {Function} [options.onComplete] - Callback function when all animations complete
     * @returns {Promise} A promise that resolves when all animations complete
     * @example
     * // Staggered fade in for list items
     * AnimationManager.stagger(
     *   document.querySelectorAll('li'),
     *   AnimationManager.animations.FADE_IN,
     *   { staggerDelay: 100 }
     * );
     */
    stagger(elements, animationType, options = {}) {
        if (!elements || elements.length === 0) {
            return Promise.reject(new Error('No elements provided'));
        }
        
        // Skip animations if user prefers reduced motion
        if (this.prefersReducedMotion) {
            if (options.onComplete) {
                options.onComplete();
            }
            return Promise.resolve();
        }
        
        const staggerDelay = options.staggerDelay || 50;
        const promises = [];
        
        // Animate each element with increasing delay
        Array.from(elements).forEach((element, index) => {
            const delay = index * staggerDelay;
            
            const promise = new Promise(resolve => {
                setTimeout(() => {
                    this.animate(element, animationType, options)
                        .then(resolve);
                }, delay);
            });
            
            promises.push(promise);
        });
        
        // Return a promise that resolves when all animations complete
        return Promise.all(promises).then(() => {
            if (options.onComplete) {
                options.onComplete();
            }
        });
    },

    /**
     * Stops all animations on an element.
     * 
     * @param {HTMLElement} element - The element to stop animations on
     * @example
     * // Stop all animations on an element
     * AnimationManager.stopAnimation(element);
     */
    stopAnimation(element) {
        if (!element) return;
        
        // Get computed style to force a reflow
        const computedStyle = window.getComputedStyle(element);
        
        // Remove all animation classes
        UIState.removeClass(element, 'animate-fade-in');
        UIState.removeClass(element, 'animate-fade-out');
        UIState.removeClass(element, 'animate-slide-in-right');
        UIState.removeClass(element, 'animate-slide-out-right');
        UIState.removeClass(element, 'animate-slide-in-left');
        UIState.removeClass(element, 'animate-slide-out-left');
        UIState.removeClass(element, 'animate-scale-in');
        UIState.removeClass(element, 'animate-scale-out');
        UIState.removeClass(element, 'animate-pulse');
        UIState.removeClass(element, 'animate-shake');
        UIState.removeClass(element, 'animate-bounce');
        
        // Remove transition classes
        UIState.removeClass(element, 'transition-all');
        UIState.removeClass(element, 'transition-opacity');
        UIState.removeClass(element, 'transition-transform');
        
        // Force stop any running animations
        UIState.setStyle(element, 'animation', 'none');
        UIState.setStyle(element, 'transition', 'none');
        
        // Force reflow
        void element.offsetWidth;
        
        // Remove the temporary styles
        UIState.removeStyle(element, 'animation');
        UIState.removeStyle(element, 'transition');
    }
}; 