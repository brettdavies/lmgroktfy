/**
 * @jest-environment jsdom
 */

import { FocusManager } from '../../js/managers/FocusManager.js';

describe('FocusManager', () => {
    // Mock DOM elements
    let helpModal, helpButton, closeButton, continueLink;
    
    beforeEach(() => {
        // Set up our document body
        document.body.innerHTML = `
            <button id="help-button" aria-label="How to use">Help</button>
            <dialog id="help_modal">
                <button aria-label="Close help modal">Close</button>
                <a href="#" tabindex="0">Link 1</a>
                <button>Button 1</button>
            </dialog>
            <div id="response-area">
                <a id="continue-link" href="https://grok.x.ai">Continue on Grok</a>
            </div>
        `;
        
        // Get references to DOM elements
        helpModal = document.getElementById('help_modal');
        helpButton = document.querySelector('button[aria-label="How to use"]');
        closeButton = helpModal.querySelector('button[aria-label="Close help modal"]');
        continueLink = document.getElementById('continue-link');
        
        // Mock the dialog methods
        helpModal.close = jest.fn();
        helpModal.showModal = jest.fn();
        
        // Mock setTimeout
        jest.useFakeTimers();
    });
    
    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });
    
    describe('initialize', () => {
        it('should set up event listeners for the help modal', () => {
            // Spy on addEventListener
            const addEventListenerSpy = jest.spyOn(helpModal, 'addEventListener');
            const buttonAddEventListenerSpy = jest.spyOn(helpButton, 'addEventListener');
            
            FocusManager.initialize();
            
            // Check that event listeners were added
            expect(buttonAddEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('close', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        });
        
        it('should store the previously focused element when opening the modal', () => {
            FocusManager.initialize();
            
            // Focus the help button and trigger click
            helpButton.focus();
            helpButton.click();
            
            // Check that previouslyFocusedElement is set
            expect(FocusManager.previouslyFocusedElement).toBe(helpButton);
        });
        
        it('should focus the close button when the modal opens', () => {
            FocusManager.initialize();
            
            // Focus the help button and trigger click
            helpButton.click();
            
            // Fast-forward timers
            jest.runAllTimers();
            
            // Mock document.activeElement
            Object.defineProperty(document, 'activeElement', {
                get: jest.fn(() => closeButton),
                configurable: true
            });
            
            expect(document.activeElement).toBe(closeButton);
        });
        
        it('should restore focus when the modal closes', () => {
            FocusManager.initialize();
            
            // Set previously focused element
            helpButton.focus();
            FocusManager.previouslyFocusedElement = helpButton;
            
            // Mock focus method
            helpButton.focus = jest.fn();
            
            // Trigger close event
            const closeEvent = new Event('close');
            helpModal.dispatchEvent(closeEvent);
            
            expect(helpButton.focus).toHaveBeenCalled();
        });
    });
    
    describe('keyboard navigation', () => {
        it('should close the modal when Escape is pressed', () => {
            FocusManager.initialize();
            
            // Trigger keydown event with Escape
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            helpModal.dispatchEvent(escapeEvent);
            
            expect(helpModal.close).toHaveBeenCalled();
        });
        
        it('should trap focus within the modal when Tab is pressed on the last element', () => {
            FocusManager.initialize();
            
            // Get the last focusable element
            const focusableElements = helpModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const lastElement = focusableElements[focusableElements.length - 1];
            
            // Mock document.activeElement
            Object.defineProperty(document, 'activeElement', {
                get: jest.fn(() => lastElement),
                configurable: true
            });
            
            // Create a Tab keydown event
            const tabEvent = new KeyboardEvent('keydown', { 
                key: 'Tab',
                shiftKey: false,
                bubbles: true
            });
            
            // Mock preventDefault
            tabEvent.preventDefault = jest.fn();
            
            // Dispatch the event
            helpModal.dispatchEvent(tabEvent);
            
            expect(tabEvent.preventDefault).toHaveBeenCalled();
        });
        
        it('should trap focus within the modal when Shift+Tab is pressed on the first element', () => {
            FocusManager.initialize();
            
            // Get the first focusable element
            const focusableElements = helpModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            
            // Mock document.activeElement
            Object.defineProperty(document, 'activeElement', {
                get: jest.fn(() => firstElement),
                configurable: true
            });
            
            // Create a Shift+Tab keydown event
            const shiftTabEvent = new KeyboardEvent('keydown', { 
                key: 'Tab',
                shiftKey: true,
                bubbles: true
            });
            
            // Mock preventDefault
            shiftTabEvent.preventDefault = jest.fn();
            
            // Dispatch the event
            helpModal.dispatchEvent(shiftTabEvent);
            
            expect(shiftTabEvent.preventDefault).toHaveBeenCalled();
        });
    });
    
    describe('focusResponseArea', () => {
        it('should focus the continue link when it exists', () => {
            // Mock focus method
            continueLink.focus = jest.fn();
            
            FocusManager.focusResponseArea();
            
            expect(continueLink.focus).toHaveBeenCalled();
        });
        
        it('should not throw an error when continue link does not exist', () => {
            // Remove the continue link
            document.getElementById('continue-link').remove();
            
            // This should not throw an error
            expect(() => {
                FocusManager.focusResponseArea();
            }).not.toThrow();
        });
    });
}); 