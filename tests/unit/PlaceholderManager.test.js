/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { PlaceholderManager } from '../../js/managers/PlaceholderManager.js';
import { UIState } from '../mocks/UIState.js';

describe('PlaceholderManager', () => {
  let originalLocation;
  let originalInnerWidth;
  let originalSetInterval;
  let originalClearInterval;
  
  beforeEach(() => {
    // Setup DOM elements
    document.body.innerHTML = `
      <form id="question-form">
        <input id="question-input" type="text" />
        <div id="custom-placeholder"></div>
        <button id="submit-button" type="submit">Submit</button>
      </form>
    `;
    
    // Save original methods
    originalSetInterval = window.setInterval;
    originalClearInterval = window.clearInterval;
    
    // Mock setInterval and clearInterval
    window.setInterval = jest.fn().mockReturnValue(123);
    window.clearInterval = jest.fn();
    
    // Save original location
    originalLocation = window.location;
    
    // Save original innerWidth
    originalInnerWidth = window.innerWidth;
    
    // Mock window.location
    delete window.location;
    window.location = { pathname: '/' };
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore window.location
    window.location = originalLocation;
    
    // Restore window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
    
    // Restore original methods
    window.setInterval = originalSetInterval;
    window.clearInterval = originalClearInterval;
    
    // Clean up
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    
    // Reset PlaceholderManager state
    if (PlaceholderManager.rotationInterval) {
      PlaceholderManager.cleanup();
    }
    PlaceholderManager.elements = {
      input: null,
      submitButton: null,
      customPlaceholder: null
    };
    PlaceholderManager.currentIndex = 0;
    PlaceholderManager.hasUrlQuestion = false;
  });
  
  test('initialize sets up elements and event listeners', () => {
    // Initialize PlaceholderManager
    PlaceholderManager.initialize();
    
    // Verify elements are set
    expect(PlaceholderManager.elements.input).not.toBeNull();
    expect(PlaceholderManager.elements.submitButton).not.toBeNull();
    expect(PlaceholderManager.elements.customPlaceholder).not.toBeNull();
    
    // Verify rotation was started
    expect(window.setInterval).toHaveBeenCalled();
  });
  
  test('setupEventListeners adds event listeners to input', () => {
    // Initialize PlaceholderManager
    PlaceholderManager.initialize();
    
    // Mock addEventListener
    const addEventListenerSpy = jest.spyOn(PlaceholderManager.elements.input, 'addEventListener');
    
    // Call setupEventListeners
    PlaceholderManager.setupEventListeners();
    
    // Verify addEventListener was called for input, focus, and blur events
    expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));
    
    // Restore original method
    addEventListenerSpy.mockRestore();
  });
  
  test('updatePlaceholder rotates through placeholders', () => {
    // Initialize PlaceholderManager
    PlaceholderManager.initialize();
    
    // Set initial state
    PlaceholderManager.currentIndex = 0;
    
    // Call updatePlaceholder
    PlaceholderManager.updatePlaceholder();
    
    // Verify currentIndex was updated
    expect(PlaceholderManager.currentIndex).toBe(1);
  });
  
  test('startRotation sets up rotation interval', () => {
    // Initialize PlaceholderManager
    PlaceholderManager.initialize();
    
    // Clear previous calls
    jest.clearAllMocks();
    
    // Call startRotation
    PlaceholderManager.startRotation();
    
    // Verify setInterval was called
    expect(window.setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      3000
    );
    
    // Verify rotationInterval was set
    expect(PlaceholderManager.rotationInterval).toBe(123);
  });
  
  test('cleanup clears rotation interval', () => {
    // Set rotationInterval
    PlaceholderManager.rotationInterval = 456;
    
    // Call cleanup
    PlaceholderManager.cleanup();
    
    // Verify clearInterval was called with correct interval ID
    expect(window.clearInterval).toHaveBeenCalledWith(456);
  });
}); 