import { UIState } from './managers/UIState.js';
import { ClipboardManager } from './managers/ClipboardManager.js';
import { ThemeManager } from './managers/ThemeManager.js';
import { ModalManager } from './managers/ModalManager.js';
import { handleQuestionSubmission } from './api/grokApi.js';

/**
 * Main application initialization
 * - Initializes theme and modal managers
 * - Sets up event listeners for form submission and sharing
 * - Handles URL-based question loading
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Managers
    ThemeManager.initialize();
    ModalManager.initialize();

    // Check for URL-based question
    const path = window.location.pathname;
    if (path && path !== '/' && path !== '/index.html') {
        let question = path.replace(/^\//, '').replace(/\?.*$/, '').trim();
        // Handle double-encoded URLs (where spaces are %2520 instead of %20)
        question = decodeURIComponent(question);
        if (question.includes('%20')) {
            question = decodeURIComponent(question);
        }
        if (question) {
            handleQuestionSubmission(question);
            UIState.elements.question().value = question;
        }
    }

    // Set up form submission
    UIState.elements.questionForm().addEventListener('submit', function(event) {
        event.preventDefault();
        handleQuestionSubmission(UIState.elements.question().value);
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
