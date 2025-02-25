import { UIState } from './managers/UIState.js';
import { ClipboardManager } from './managers/ClipboardManager.js';
import { PlaceholderManager } from './managers/PlaceholderManager.js';
import { ThemeManager } from './managers/ThemeManager.js';
import { FocusManager } from './managers/FocusManager.js';
import { handleQuestionSubmission } from './api/grokApi.js';
import config from './config.js';
import i18n from './i18n/i18n.js';

/**
 * Main application initialization
 * - Sets up event listeners for form submission and sharing
 * - Initializes all managers and i18n
 * - Handles URL-based question loading
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[App] DOM content loaded, initializing application');
    
    try {
        // Step 1: Initialize configuration
        await config.init();
        console.log('[Config] Initialized with environment:', 
                    config.get('isDevelopment') ? 'development' : 'production');
        
        // Step 2: Initialize UI managers
        console.log('[App] Initializing UI managers');
        PlaceholderManager.initialize();
        ThemeManager.initialize();
        FocusManager.initialize();
        
        // Step 3: Set up event listeners
        setupEventListeners();
        
        // Step 4: Initialize i18n system
        console.log('[App] Initializing internationalization');
        const savedLanguage = localStorage.getItem('userLanguage');
        console.log('[App] Saved language in localStorage:', savedLanguage);
        
        await i18n.init({
            supportedLanguages: ['en', 'es', 'fr', 'de', 'ja'],
            defaultLanguage: 'en',
            languageSwitcherSelector: '#language-switcher'
        });
        
        console.log('[App] Language after i18n init:', i18n.currentLanguage);
        console.log('[App] Available translations:', Object.keys(i18n.translations));
        
        // Step 5: Process URL parameters after a short delay to ensure everything is ready
        setTimeout(() => {
            // Force retranslation to ensure all elements are properly translated
            console.log('[App] Forcing retranslation after delay');
            i18n.translateDocument();
            
            // Process URL parameters after translations are applied
            processUrlParameters();
        }, 500);
        
        console.log('[App] Initialization complete');
    } catch (error) {
        console.error('[App] Error during initialization:', error);
    }
});

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    console.log('[App] Setting up event listeners');
    
    // Handle home link clicks
    document.querySelector('.home-link').addEventListener('click', function(e) {
        e.preventDefault();
        // Reset form and UI state
        UIState.elements.question().value = '';
        UIState.elements.answer().innerText = '';
        UIState.elements.response().classList.add('hidden');
        UIState.elements.questionForm().classList.remove('hidden');
        UIState.hideAllButtons();
        
        // Reset placeholder and submit button state
        PlaceholderManager.reset();
        
        // Explicitly disable submit button until input is entered
        const submitButton = UIState.elements.questionForm().querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
        }
        
        // Update URL without triggering a reload
        window.history.pushState({}, '', '/');
    });

    // Set up form submission
    UIState.elements.questionForm().addEventListener('submit', function(event) {
        event.preventDefault();
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        handleQuestionSubmission(UIState.elements.question().value)
            .finally(() => {
                submitButton.disabled = false;
            });
    });

    // Set up copy/share buttons
    UIState.elements.buttons.copyQA().addEventListener('click', () => 
        ClipboardManager.copyText(ClipboardManager.getShareableText('qa'), 'Question and answer copied!'));

    UIState.elements.buttons.copyAnswer().addEventListener('click', () => 
        ClipboardManager.copyText(ClipboardManager.getShareableText('answer'), 'Answer copied!'));

    UIState.elements.buttons.share().addEventListener('click', () => 
        ClipboardManager.copyText(ClipboardManager.getShareableText('url'), 'Share link copied!'));

    UIState.elements.buttons.shareOnX().addEventListener('click', () => {
        const tweetText = ClipboardManager.getShareableText('tweet');
        const shareUrl = ClipboardManager.getShareableText('shareUrl');
        window.open(`https://x.com/intent/tweet?text=${tweetText}&url=${shareUrl}`, '_blank');
    });
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Only process shortcuts if no modals are open and not in an input field
        const isInInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
        const isModalOpen = document.querySelector('dialog[open]') !== null;
        
        if (isInInput || isModalOpen) return;
        
        // ? or / - Focus the question input
        if (e.key === '?' || e.key === '/') {
            e.preventDefault();
            UIState.elements.question().focus();
        }
        
        // h - Open help modal
        else if (e.key === 'h') {
            e.preventDefault();
            document.querySelector('button[aria-label="How to use"]').click();
        }
        
        // t - Toggle theme
        else if (e.key === 't') {
            e.preventDefault();
            document.getElementById('theme-toggle').click();
        }
        
        // Shortcuts that only work when a response is visible
        const responseVisible = !UIState.elements.response().classList.contains('hidden');
        if (responseVisible) {
            // c - Copy answer
            if (e.key === 'c') {
                e.preventDefault();
                UIState.elements.buttons.copyAnswer().click();
            }
            
            // q - Copy question and answer
            else if (e.key === 'q') {
                e.preventDefault();
                UIState.elements.buttons.copyQA().click();
            }
            
            // s - Copy share link
            else if (e.key === 's') {
                e.preventDefault();
                UIState.elements.buttons.share().click();
            }
            
            // g - Continue on Grok
            else if (e.key === 'g') {
                e.preventDefault();
                window.open(UIState.elements.buttons.continueLink().href, '_blank');
            }
        }
    });
}

/**
 * Process URL parameters to handle direct question links
 */
function processUrlParameters() {
    console.log('[URL Handler] Checking URL path:', window.location.pathname);
    const path = window.location.pathname;
    
    // Skip processing for root path or index.html
    if (!path || path === '/' || path === '/index.html') {
        console.log('[URL Handler] No path to process');
        return;
    }
    
    try {
        // Remove leading slash and any query parameters
        let question = path.replace(/^\//, '').replace(/\?.*$/, '').trim();
        
        // Handle SPA routing - decode the URL component
        question = decodeURIComponent(question);
        console.log('[URL Handler] Decoded question from URL:', question);
        
        // Handle double-encoded URLs (where spaces are %2520 instead of %20)
        if (question.includes('%20')) {
            question = decodeURIComponent(question);
            console.log('[URL Handler] Double-decoded question:', question);
        }
        
        if (question) {
            console.log('[URL Handler] Setting question from URL and submitting');
            UIState.elements.question().value = question;
            PlaceholderManager.updatePlaceholderVisibility(question);
            
            // Ensure the submit button is enabled
            const submitButton = UIState.elements.questionForm().querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                console.log('[URL Handler] Enabled submit button');
            }
            
            // Submit the question
            handleQuestionSubmission(question);
        }
    } catch (error) {
        console.error('[URL Handler] Error processing URL parameters:', error);
    }
}
