/**
 * @jest-environment jsdom
 */

import { UIState } from '../../js/managers/UIState.js';
import { PlaceholderManager } from '../../js/managers/PlaceholderManager.js';
import { handleQuestionSubmission } from '../../js/api/grokApi.js';
import { ClipboardManager } from '../../js/managers/ClipboardManager.js';

// Mock the modules
jest.mock('../../js/managers/UIState.js');
jest.mock('../../js/managers/PlaceholderManager.js');
jest.mock('../../js/managers/ThemeManager.js', () => ({
    ThemeManager: {
        initialize: jest.fn()
    }
}));
jest.mock('../../js/managers/FocusManager.js', () => ({
    FocusManager: {
        initialize: jest.fn()
    }
}));
jest.mock('../../js/api/grokApi.js');
jest.mock('../../js/managers/ClipboardManager.js');

describe('script.js', () => {
    // Store original window.location
    const originalLocation = window.location;
    
    beforeEach(() => {
        // Set up our document body
        document.body.innerHTML = `
            <form id="question-form">
                <input id="question-input" type="text" value="">
                <button type="submit">Ask Grok</button>
            </form>
            <div id="response" style="display: none;">
                <div id="answer"></div>
                <div id="action-buttons">
                    <button id="copy-answer">Copy Answer</button>
                    <button id="copy-qa">Copy Q&A</button>
                    <button id="share">Share</button>
                    <button id="share-on-x">Share on X</button>
                    <a id="continue-link" href="https://grok.x.ai">Continue on Grok</a>
                </div>
            </div>
            <a class="home-link" href="/">Home</a>
            <button id="theme-toggle" aria-label="Toggle theme">Toggle Theme</button>
            <button aria-label="How to use">Help</button>
            <dialog id="help_modal">
                <button aria-label="Close help modal">Close</button>
            </dialog>
        `;
        
        // Mock UIState elements
        UIState.elements = {
            question: jest.fn(() => document.getElementById('question-input')),
            answer: jest.fn(() => document.getElementById('answer')),
            response: jest.fn(() => document.getElementById('response')),
            questionForm: jest.fn(() => document.getElementById('question-form')),
            buttons: {
                copyAnswer: jest.fn(() => document.getElementById('copy-answer')),
                copyQA: jest.fn(() => document.getElementById('copy-qa')),
                share: jest.fn(() => document.getElementById('share')),
                shareOnX: jest.fn(() => document.getElementById('share-on-x')),
                continueLink: jest.fn(() => document.getElementById('continue-link'))
            },
            hideAllButtons: jest.fn()
        };
        
        // Mock window.open
        window.open = jest.fn();
        
        // Mock window.history
        window.history.pushState = jest.fn();
        
        // Reset all mocks
        jest.clearAllMocks();
        
        // Delete the script module from cache to ensure it's reloaded
        delete require.cache[require.resolve('../../js/script.js')];
    });
    
    afterEach(() => {
        // Restore window.location
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true
        });
        
        jest.clearAllMocks();
    });
    
    it('should initialize all managers on DOMContentLoaded', () => {
        // Import the script to trigger the DOMContentLoaded event handler
        require('../../js/script.js');
        
        // Manually trigger the DOMContentLoaded event
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
        
        // Check that all managers were initialized
        expect(PlaceholderManager.initialize).toHaveBeenCalled();
        expect(require('../../js/managers/ThemeManager.js').ThemeManager.initialize).toHaveBeenCalled();
        expect(require('../../js/managers/FocusManager.js').FocusManager.initialize).toHaveBeenCalled();
    });
    
    it('should handle home link clicks', () => {
        // Import the script
        require('../../js/script.js');
        
        // Trigger DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Click the home link
        const homeLink = document.querySelector('.home-link');
        const clickEvent = new MouseEvent('click');
        
        // Mock preventDefault
        clickEvent.preventDefault = jest.fn();
        
        homeLink.dispatchEvent(clickEvent);
        
        // Check that preventDefault was called
        expect(clickEvent.preventDefault).toHaveBeenCalled();
        
        // Check that the form was reset
        expect(document.getElementById('question-input').value).toBe('');
        expect(document.getElementById('answer').innerText).toBe('');
        expect(document.getElementById('response').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('question-form').classList.contains('hidden')).toBe(false);
        
        // Check that the submit button is disabled
        const submitButton = document.querySelector('button[type="submit"]');
        expect(submitButton.disabled).toBe(true);
        
        // Check that other functions were called
        expect(UIState.hideAllButtons).toHaveBeenCalled();
        expect(PlaceholderManager.reset).toHaveBeenCalled();
        expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/');
    });
    
    it('should handle form submission', () => {
        // Set up a mock Promise for handleQuestionSubmission
        handleQuestionSubmission.mockReturnValue(Promise.resolve());
        
        // Import the script
        require('../../js/script.js');
        
        // Trigger DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Set a question value
        const questionInput = document.getElementById('question-input');
        questionInput.value = 'Test question';
        
        // Submit the form
        const form = document.getElementById('question-form');
        const submitEvent = new Event('submit');
        submitEvent.preventDefault = jest.fn();
        
        form.dispatchEvent(submitEvent);
        
        // Check that preventDefault was called
        expect(submitEvent.preventDefault).toHaveBeenCalled();
        
        // Check that handleQuestionSubmission was called with the question
        expect(handleQuestionSubmission).toHaveBeenCalledWith('Test question');
    });
    
    it('should set up copy and share buttons', () => {
        // Mock the ClipboardManager methods
        ClipboardManager.getShareableText.mockImplementation((type) => {
            if (type === 'qa') return 'Q: Test question\nA: Test answer';
            if (type === 'answer') return 'Test answer';
            if (type === 'url') return 'https://example.com/share';
            if (type === 'tweet') return 'Check out this answer from Grok!';
            if (type === 'shareUrl') return 'https://example.com/share';
            return '';
        });
        
        // Import the script
        require('../../js/script.js');
        
        // Trigger DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Click the copy answer button
        const copyAnswerButton = document.getElementById('copy-answer');
        copyAnswerButton.click();
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith('Test answer', 'Answer copied!');
        
        // Click the copy Q&A button
        const copyQAButton = document.getElementById('copy-qa');
        copyQAButton.click();
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith('Q: Test question\nA: Test answer', 'Question and answer copied!');
        
        // Click the share button
        const shareButton = document.getElementById('share');
        shareButton.click();
        
        // Check that copyText was called with the right arguments
        expect(ClipboardManager.copyText).toHaveBeenCalledWith('https://example.com/share', 'Share link copied!');
        
        // Click the share on X button
        const shareOnXButton = document.getElementById('share-on-x');
        shareOnXButton.click();
        
        // Check that window.open was called with the right URL
        expect(window.open).toHaveBeenCalledWith(
            'https://x.com/intent/tweet?text=Check out this answer from Grok!&url=https://example.com/share',
            '_blank'
        );
    });
    
    it('should handle keyboard shortcuts', () => {
        // Import the script
        require('../../js/script.js');
        
        // Trigger DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Mock document.activeElement to be the body
        Object.defineProperty(document, 'activeElement', {
            get: jest.fn(() => document.body),
            configurable: true
        });
        
        // Mock the click methods for buttons
        const helpButton = document.querySelector('button[aria-label="How to use"]');
        helpButton.click = jest.fn();
        
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.click = jest.fn();
        
        const copyAnswerButton = document.getElementById('copy-answer');
        copyAnswerButton.click = jest.fn();
        
        const copyQAButton = document.getElementById('copy-qa');
        copyQAButton.click = jest.fn();
        
        const shareButton = document.getElementById('share');
        shareButton.click = jest.fn();
        
        // Test the ? shortcut
        const questionEvent = new KeyboardEvent('keydown', { 
            key: '?',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const preventDefaultMock = jest.fn();
        Object.defineProperty(questionEvent, 'preventDefault', {
            value: preventDefaultMock
        });
        
        document.dispatchEvent(questionEvent);
        
        // Check that preventDefault was called
        expect(preventDefaultMock).toHaveBeenCalled();
        
        // Test the h shortcut
        const helpEvent = new KeyboardEvent('keydown', { 
            key: 'h',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const helpPreventDefaultMock = jest.fn();
        Object.defineProperty(helpEvent, 'preventDefault', {
            value: helpPreventDefaultMock
        });
        
        document.dispatchEvent(helpEvent);
        
        // Check that preventDefault was called and the help button was clicked
        expect(helpPreventDefaultMock).toHaveBeenCalled();
        expect(helpButton.click).toHaveBeenCalled();
        
        // Test the t shortcut
        const themeEvent = new KeyboardEvent('keydown', { 
            key: 't',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const themePreventDefaultMock = jest.fn();
        Object.defineProperty(themeEvent, 'preventDefault', {
            value: themePreventDefaultMock
        });
        
        document.dispatchEvent(themeEvent);
        
        // Check that preventDefault was called and the theme toggle was clicked
        expect(themePreventDefaultMock).toHaveBeenCalled();
        expect(themeToggle.click).toHaveBeenCalled();
        
        // Make the response visible to test response-specific shortcuts
        document.getElementById('response').classList.remove('hidden');
        
        // Test the c shortcut
        const copyEvent = new KeyboardEvent('keydown', { 
            key: 'c',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const copyPreventDefaultMock = jest.fn();
        Object.defineProperty(copyEvent, 'preventDefault', {
            value: copyPreventDefaultMock
        });
        
        document.dispatchEvent(copyEvent);
        
        // Check that preventDefault was called and the copy answer button was clicked
        expect(copyPreventDefaultMock).toHaveBeenCalled();
        expect(copyAnswerButton.click).toHaveBeenCalled();
        
        // Test the q shortcut
        const qaEvent = new KeyboardEvent('keydown', { 
            key: 'q',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const qaPreventDefaultMock = jest.fn();
        Object.defineProperty(qaEvent, 'preventDefault', {
            value: qaPreventDefaultMock
        });
        
        document.dispatchEvent(qaEvent);
        
        // Check that preventDefault was called and the copy Q&A button was clicked
        expect(qaPreventDefaultMock).toHaveBeenCalled();
        expect(copyQAButton.click).toHaveBeenCalled();
        
        // Test the s shortcut
        const shareEvent = new KeyboardEvent('keydown', { 
            key: 's',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const sharePreventDefaultMock = jest.fn();
        Object.defineProperty(shareEvent, 'preventDefault', {
            value: sharePreventDefaultMock
        });
        
        document.dispatchEvent(shareEvent);
        
        // Check that preventDefault was called and the share button was clicked
        expect(sharePreventDefaultMock).toHaveBeenCalled();
        expect(shareButton.click).toHaveBeenCalled();
        
        // Test the g shortcut
        const grokEvent = new KeyboardEvent('keydown', { 
            key: 'g',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const grokPreventDefaultMock = jest.fn();
        Object.defineProperty(grokEvent, 'preventDefault', {
            value: grokPreventDefaultMock
        });
        
        document.dispatchEvent(grokEvent);
        
        // Check that preventDefault was called and window.open was called with the right URL
        expect(grokPreventDefaultMock).toHaveBeenCalled();
        expect(window.open).toHaveBeenCalledWith('https://grok.x.ai/', '_blank');
    });
    
    it('should not trigger shortcuts when in input fields', () => {
        // Import the script
        require('../../js/script.js');
        
        // Trigger DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Focus the question input
        const questionInput = document.getElementById('question-input');
        
        // Mock document.activeElement
        Object.defineProperty(document, 'activeElement', {
            get: jest.fn(() => questionInput),
            configurable: true
        });
        
        // Test the ? shortcut
        const questionEvent = new KeyboardEvent('keydown', { 
            key: '?',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const preventDefaultMock = jest.fn();
        Object.defineProperty(questionEvent, 'preventDefault', {
            value: preventDefaultMock
        });
        
        document.dispatchEvent(questionEvent);
        
        // Check that preventDefault was NOT called
        expect(preventDefaultMock).not.toHaveBeenCalled();
    });
    
    it('should not trigger shortcuts when a modal is open', () => {
        // Import the script
        require('../../js/script.js');
        
        // Trigger DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Open the help modal
        const helpModal = document.getElementById('help_modal');
        helpModal.setAttribute('open', '');
        
        // Test the ? shortcut
        const questionEvent = new KeyboardEvent('keydown', { 
            key: '?',
            bubbles: true 
        });
        
        // Create a custom preventDefault method
        const preventDefaultMock = jest.fn();
        Object.defineProperty(questionEvent, 'preventDefault', {
            value: preventDefaultMock
        });
        
        document.dispatchEvent(questionEvent);
        
        // Check that preventDefault was NOT called
        expect(preventDefaultMock).not.toHaveBeenCalled();
    });
    
    test('clicking home link and submitting a new question works correctly', async () => {
        // Set up the DOM
        document.body.innerHTML = `
            <a class="home-link" href="/">Home</a>
            <form id="question-form">
                <input id="question-input" type="text">
                <button type="submit">Submit</button>
            </form>
            <div id="loading" class="hidden"></div>
            <div id="response" class="hidden">
                <p id="question-display"></p>
                <p id="answer"></p>
            </div>
            <div id="custom-placeholder"></div>
        `;
        
        // Mock the API response
        global.fetch = jest.fn().mockImplementation(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ answer: 'Test answer' })
            })
        );
        
        // Mock window.history
        window.history.pushState = jest.fn();
        window.history.replaceState = jest.fn();
        
        // Import the script
        jest.resetModules();
        require('../../js/script.js');
        
        // Trigger DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Simulate a successful API response
        const questionInput = document.getElementById('question-input');
        questionInput.value = 'First question';
        
        // Submit the form
        const form = document.getElementById('question-form');
        form.dispatchEvent(new Event('submit'));
        
        // Wait for the API call to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Verify the first answer is displayed
        expect(document.getElementById('response').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('question-display').innerText).toBe('First question');
        expect(document.getElementById('answer').innerText).toBe('Test answer');
        
        // Click the home link to reset
        const homeLink = document.querySelector('.home-link');
        const clickEvent = new MouseEvent('click');
        clickEvent.preventDefault = jest.fn();
        homeLink.dispatchEvent(clickEvent);
        
        // Verify the UI is reset
        expect(document.getElementById('response').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('question-form').classList.contains('hidden')).toBe(false);
        expect(questionInput.value).toBe('');
        
        // Submit a second question
        questionInput.value = 'Second question';
        form.dispatchEvent(new Event('submit'));
        
        // Wait for the API call to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Verify the second answer is displayed
        expect(document.getElementById('response').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('question-display').innerText).toBe('Second question');
        expect(document.getElementById('answer').innerText).toBe('Test answer');
    });
}); 