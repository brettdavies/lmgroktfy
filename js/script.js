import { UIState } from './managers/UIState.js';
import { ClipboardManager } from './managers/ClipboardManager.js';
import { PlaceholderManager } from './managers/PlaceholderManager.js';
import { ThemeManager } from './managers/ThemeManager.js';
import { FocusManager } from './managers/FocusManager.js';
import { handleQuestionSubmission } from './api/grokApi.js';

/**
 * Main application initialization
 * - Sets up event listeners for form submission and sharing
 * - Handles URL-based question loading
 * - Initializes all managers
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize managers
    PlaceholderManager.initialize();
    ThemeManager.initialize();
    FocusManager.initialize();

    // Handle home link clicks
    document.querySelector('.home-link').addEventListener('click', function(e) {
        e.preventDefault();
        // Reset form and UI state
        UIState.elements.question().value = '';
        UIState.elements.answer().innerText = '';
        UIState.elements.response().style.display = 'none';
        UIState.elements.questionForm().style.display = 'block';
        UIState.hideAllButtons();
        // Reset placeholder and submit button state
        PlaceholderManager.reset();
        // Update URL without triggering a reload
        window.history.pushState({}, '', '/');
    });

    // Check for URL-based question
    const path = window.location.pathname;
    if (path && path !== '/' && path !== '/index.html') {
        let question = path.replace(/^\//, '').replace(/\?.*$/, '').trim();
        question = decodeURIComponent(question);
        // Handle double-encoded URLs (where spaces are %2520 instead of %20)
        if (question.includes('%20')) {
            question = decodeURIComponent(question);
        }
        if (question) {
            UIState.elements.question().value = question;
            PlaceholderManager.updatePlaceholderVisibility(question);
            handleQuestionSubmission(question);
        }
    }

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
});
