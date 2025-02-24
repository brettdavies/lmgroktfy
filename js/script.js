import { UIState } from './managers/UIState.js';
import { ClipboardManager } from './managers/ClipboardManager.js';
import { PlaceholderManager } from './managers/PlaceholderManager.js';
import { ThemeManager } from './managers/ThemeManager.js';
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
});
