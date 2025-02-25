/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost/"}
 */

// Import Jest globals
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Import modules first
import { UIState } from '../../js/managers/UIState.js';
import { PlaceholderManager } from '../../js/managers/PlaceholderManager.js';
import { handleQuestionSubmission } from '../../js/api/grokApi.js';
import { ClipboardManager } from '../../js/managers/ClipboardManager.js';
import { ThemeManager } from '../../js/managers/ThemeManager.js';
import { FocusManager } from '../../js/managers/FocusManager.js';

// Set up global mocks
window.open = jest.fn();

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      apiBaseUrl: 'https://test-api.example.com',
      debugMode: true
    })
  })
);

// Mock modules
jest.mock('../../js/managers/UIState.js', () => ({
    UIState: {
        elements: {
            questionInput: jest.fn(),
            questionForm: jest.fn(),
            response: jest.fn(),
            questionDisplay: jest.fn(),
            answer: jest.fn(),
            submitButton: jest.fn(),
            customPlaceholder: jest.fn(),
            buttons: {
                copyAnswer: jest.fn(),
                copyQA: jest.fn(),
                share: jest.fn(),
                shareOnX: jest.fn(),
                continueLink: jest.fn(),
                useGrok: jest.fn()
            }
        },
        show: jest.fn(),
        hide: jest.fn(),
        setOpacity: jest.fn(),
        enableButton: jest.fn(),
        disableButton: jest.fn(),
        setSubmitButtonState: jest.fn(),
        showQuestionForm: jest.fn(),
        hideQuestionForm: jest.fn(),
        showResponse: jest.fn(),
        hideResponse: jest.fn(),
        resetUI: jest.fn(),
        showLoading: jest.fn(),
        hideLoading: jest.fn(),
        showError: jest.fn(),
        showSuccess: jest.fn(),
        hideAllButtons: jest.fn(),
        showAllButtons: jest.fn(),
        updateGrokButtons: jest.fn(),
        showToast: jest.fn(),
        updatePlaceholderVisibility: jest.fn(),
        initViewportHandling: jest.fn(),
        checkViewport: jest.fn(),
        setMobileLayout: jest.fn(),
        setDesktopLayout: jest.fn(),
        enhanceForTouch: jest.fn(),
        adjustForViewport: jest.fn()
    }
}));

jest.mock('../../js/managers/PlaceholderManager.js', () => ({
    PlaceholderManager: {
        initialize: jest.fn(),
        updatePlaceholderVisibility: jest.fn(),
        reset: jest.fn(),
        cleanup: jest.fn(),
    }
}));

jest.mock('../../js/api/grokApi.js', () => ({
    handleQuestionSubmission: jest.fn(),
}));

jest.mock('../../js/managers/ClipboardManager.js', () => ({
    ClipboardManager: {
        copyText: jest.fn(),
        getShareableText: jest.fn((type) => {
            if (type === 'qa') return 'Test question\n\nTest answer';
            if (type === 'answer') return 'Test answer';
            if (type === 'url') return 'https://example.com/share';
            return '';
        }),
    }
}));

// Mock i18n module
jest.mock('../../js/i18n/i18n.js', () => ({
  __esModule: true,
  default: {
    init: jest.fn().mockResolvedValue({}),
    setLanguage: jest.fn().mockResolvedValue({}),
    t: jest.fn(key => key),
    currentLanguage: 'en',
    supportedLanguages: ['en', 'es'],
    translations: {
      en: {
        main: {
          title: 'Test Title'
        }
      }
    }
  }
}));

// Mock ThemeManager
jest.mock('../../js/managers/ThemeManager.js', () => ({
  ThemeManager: {
    initialize: jest.fn(),
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
    getTheme: jest.fn().mockReturnValue('light'),
    saveTheme: jest.fn(),
    loadTheme: jest.fn()
  }
}));

// Mock FocusManager
jest.mock('../../js/managers/FocusManager.js', () => ({
  FocusManager: {
    initialize: jest.fn(),
    setFocus: jest.fn(),
    clearFocus: jest.fn(),
    trapFocus: jest.fn(),
    releaseFocusTrap: jest.fn(),
    handleKeyboardNavigation: jest.fn()
  }
}));

// Set up document body for testing
beforeEach(() => {
    document.body.innerHTML = `
        <form id="question-form">
            <input id="question-input" type="text" value="">
            <button type="submit">Ask Grok</button>
        </form>
        <div id="response" class="hidden">
            <div id="question-display"></div>
            <div id="answer"></div>
            <div id="action-buttons">
                <button id="copy-question-answer-button">Copy Q&A</button>
                <button id="copy-answer-button">Copy Answer</button>
                <button id="share-button">Share</button>
                <button id="share-on-x-button">Share on X</button>
                <a id="continue-link" href="https://grok.x.ai">Continue on Grok</a>
            </div>
        </div>
        <a href="/" class="home-link">Home</a>
        <button id="theme-toggle" aria-label="Toggle theme">Toggle Theme</button>
        <button aria-label="How to use">Help</button>
        <dialog id="help_modal">
            <button aria-label="Close help modal">Close</button>
        </dialog>
    `;

    // Set up element getters after DOM is ready
    UIState.elements.questionInput.mockImplementation(() => document.getElementById('question-input'));
    UIState.elements.questionForm.mockImplementation(() => document.getElementById('question-form'));
    UIState.elements.response.mockImplementation(() => document.getElementById('response'));
    UIState.elements.questionDisplay.mockImplementation(() => document.getElementById('question-display'));
    UIState.elements.answer.mockImplementation(() => document.getElementById('answer'));
    UIState.elements.submitButton.mockImplementation(() => document.querySelector('button[type="submit"]'));
    UIState.elements.customPlaceholder.mockImplementation(() => document.getElementById('custom-placeholder'));
    UIState.elements.buttons.copyAnswer.mockImplementation(() => document.getElementById('copy-answer-button'));
    UIState.elements.buttons.copyQA.mockImplementation(() => document.getElementById('copy-question-answer-button'));
    UIState.elements.buttons.share.mockImplementation(() => document.getElementById('share-button'));
    UIState.elements.buttons.shareOnX.mockImplementation(() => document.getElementById('share-on-x-button'));
    UIState.elements.buttons.continueLink.mockImplementation(() => document.getElementById('continue-link'));

    // Reset all mocks
    jest.clearAllMocks();
});

describe('script.js', () => {
    test('should initialize all managers on DOMContentLoaded', async () => {
        // Load the script
        await import('../../js/script.js');
        
        // Simulate DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Check that all managers were initialized
        expect(PlaceholderManager.initialize).toHaveBeenCalled();
        expect(ThemeManager.initialize).toHaveBeenCalled();
        expect(FocusManager.initialize).toHaveBeenCalled();
    });

    test('should handle home link clicks', async () => {
        // Load the script
        await import('../../js/script.js');
        
        // Simulate DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Create a click event
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        });
        
        // Mock preventDefault
        Object.defineProperty(clickEvent, 'preventDefault', {
            value: jest.fn()
        });
        
        // Get the home link and simulate a click
        const homeLink = document.querySelector('.home-link');
        homeLink.dispatchEvent(clickEvent);
        
        // Check that preventDefault was called
        expect(clickEvent.preventDefault).toHaveBeenCalled();
        
        // Check that resetUI was called
        expect(UIState.resetUI).toHaveBeenCalled();
        
        // Check that PlaceholderManager.reset was called
        expect(PlaceholderManager.reset).toHaveBeenCalled();
    });

    test('should handle form submission', async () => {
        // Load the script
        await import('../../js/script.js');
        
        // Simulate DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Set up the form with a question
        const questionInput = document.getElementById('question-input');
        questionInput.value = 'Test question';
        
        // Create a submit event
        const submitEvent = new Event('submit', {
            bubbles: true,
            cancelable: true
        });
        
        // Mock preventDefault
        Object.defineProperty(submitEvent, 'preventDefault', {
            value: jest.fn()
        });
        
        // Get the form and simulate a submit
        const form = document.getElementById('question-form');
        form.dispatchEvent(submitEvent);
        
        // Check that preventDefault was called
        expect(submitEvent.preventDefault).toHaveBeenCalled();
        
        // Check that disableButton was called
        expect(UIState.disableButton).toHaveBeenCalled();
        
        // Check that handleQuestionSubmission was called with the right arguments
        expect(handleQuestionSubmission).toHaveBeenCalledWith('Test question');
    });

    test('should set up copy and share buttons', async () => {
        // Load the script
        await import('../../js/script.js');
        
        // Simulate DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Set up the answer
        document.getElementById('answer').innerText = 'Test answer';
        document.getElementById('question-display').innerText = 'Test question';
        
        // Click the copy answer button
        const copyButton = document.getElementById('copy-answer-button');
        copyButton.click();
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith('Test answer', 'Answer copied!');
        
        // Click the copy Q&A button
        const copyQAButton = document.getElementById('copy-question-answer-button');
        copyQAButton.click();
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith('Test question\n\nTest answer', 'Q&A copied!');
        
        // Click the share button
        const shareButton = document.getElementById('share-button');
        shareButton.click();
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith(expect.any(String), 'Link copied!');
    });

    test('should handle keyboard shortcuts', async () => {
        // Mock document.activeElement
        Object.defineProperty(document, 'activeElement', {
            get: jest.fn(() => document.getElementById('question-input')),
            configurable: true
        });
        
        // Load the script
        await import('../../js/script.js');
        
        // Simulate DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Focus the question input
        document.getElementById('question-input').focus();
        
        // Check that the question input is focused
        expect(document.activeElement).toBe(document.getElementById('question-input'));
        
        // Test the h shortcut
        const helpEvent = new KeyboardEvent('keydown', { key: 'h' });
        document.dispatchEvent(helpEvent);
        
        // Test the t shortcut
        const themeEvent = new KeyboardEvent('keydown', { key: 't' });
        document.dispatchEvent(themeEvent);
        
        // Check that toggleTheme was called
        expect(ThemeManager.toggleTheme).toHaveBeenCalled();
        
        // Set up the answer for copy shortcuts
        document.getElementById('response').classList.remove('hidden');
        document.getElementById('answer').innerText = 'Test answer';
        document.getElementById('question-display').innerText = 'Test question';
        
        // Test the c shortcut
        const copyEvent = new KeyboardEvent('keydown', { key: 'c' });
        document.dispatchEvent(copyEvent);
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith('Test answer', 'Answer copied!');
        
        // Test the q shortcut
        const copyQAEvent = new KeyboardEvent('keydown', { key: 'q' });
        document.dispatchEvent(copyQAEvent);
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith('Test question\n\nTest answer', 'Q&A copied!');
        
        // Test the s shortcut
        const shareEvent = new KeyboardEvent('keydown', { key: 's' });
        document.dispatchEvent(shareEvent);
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith(expect.any(String), 'Link copied!');
    });

    test('clicking home link and submitting a new question works correctly', async () => {
        // Load the script
        await import('../../js/script.js');
        
        // Simulate DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Mock successful API response
        handleQuestionSubmission.mockImplementation((question) => {
            // Simulate API response
            UIState.showSuccess('Test answer', question);
            document.getElementById('question-display').innerText = question;
            document.getElementById('answer').innerText = 'Test answer';
            document.getElementById('response').classList.remove('hidden');
        });
        
        // Submit first question
        const questionInput = document.getElementById('question-input');
        questionInput.value = 'First question';
        
        // Create a submit event
        const submitEvent = new Event('submit', {
            bubbles: true,
            cancelable: true
        });
        
        // Mock preventDefault
        Object.defineProperty(submitEvent, 'preventDefault', {
            value: jest.fn()
        });
        
        // Get the form and simulate a submit
        const form = document.getElementById('question-form');
        form.dispatchEvent(submitEvent);
        
        // Verify the first answer is displayed
        expect(document.getElementById('response').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('question-display').innerText).toBe('First question');
        expect(document.getElementById('answer').innerText).toBe('Test answer');
        
        // Click home link
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        });
        
        // Mock preventDefault
        Object.defineProperty(clickEvent, 'preventDefault', {
            value: jest.fn()
        });
        
        const homeLink = document.querySelector('.home-link');
        homeLink.dispatchEvent(clickEvent);
        
        // Verify UI is reset
        expect(UIState.resetUI).toHaveBeenCalled();
        expect(PlaceholderManager.reset).toHaveBeenCalled();
        
        // Submit second question
        questionInput.value = 'Second question';
        
        // Create another submit event
        const submitEvent2 = new Event('submit', {
            bubbles: true,
            cancelable: true
        });
        
        // Mock preventDefault
        Object.defineProperty(submitEvent2, 'preventDefault', {
            value: jest.fn()
        });
        
        form.dispatchEvent(submitEvent2);
        
        // Verify the second answer is displayed
        expect(document.getElementById('question-display').innerText).toBe('Second question');
        expect(document.getElementById('answer').innerText).toBe('Test answer');
    });
}); 