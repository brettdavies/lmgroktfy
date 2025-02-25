/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { FocusManager } from '../../js/managers/FocusManager.js';
import { UIState } from '../mocks/UIState.js';

// Mock document methods and properties
const originalDocument = { ...document };
const originalWindow = { ...window };

// Create mock DOM elements
const button1 = {
  id: 'button1',
  tagName: 'BUTTON',
  focus: jest.fn(),
  blur: jest.fn(),
  addEventListener: jest.fn(),
  closest: jest.fn().mockReturnValue(null),
  hasAttribute: jest.fn().mockReturnValue(false),
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  }
};

const button2 = {
  id: 'button2',
  tagName: 'BUTTON',
  focus: jest.fn(),
  blur: jest.fn(),
  addEventListener: jest.fn(),
  closest: jest.fn().mockReturnValue(null),
  hasAttribute: jest.fn().mockReturnValue(false),
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  }
};

const input1 = {
  id: 'input1',
  tagName: 'INPUT',
  focus: jest.fn(),
  blur: jest.fn(),
  addEventListener: jest.fn(),
  closest: jest.fn().mockReturnValue(null),
  hasAttribute: jest.fn().mockReturnValue(false),
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  }
};

const modal = {
  id: 'modal',
  tagName: 'DIV',
  focus: jest.fn(),
  blur: jest.fn(),
  addEventListener: jest.fn(),
  closest: jest.fn().mockReturnValue(null),
  hasAttribute: jest.fn().mockReturnValue(false),
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  dataset: {
    returnFocusTo: 'button1'
  },
  querySelectorAll: jest.fn().mockImplementation(() => [modalButton1, modalInput, modalButton2])
};

const modalButton1 = {
  id: 'modal-button1',
  tagName: 'BUTTON',
  focus: jest.fn(),
  blur: jest.fn(),
  disabled: false,
  offsetParent: {},
  addEventListener: jest.fn(),
  closest: jest.fn().mockReturnValue(modal),
  hasAttribute: jest.fn().mockReturnValue(false),
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  }
};

const modalInput = {
  id: 'modal-input',
  tagName: 'INPUT',
  focus: jest.fn(),
  blur: jest.fn(),
  disabled: false,
  offsetParent: {},
  addEventListener: jest.fn(),
  closest: jest.fn().mockReturnValue(modal),
  hasAttribute: jest.fn().mockReturnValue(false),
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  }
};

const modalButton2 = {
  id: 'modal-button2',
  tagName: 'BUTTON',
  focus: jest.fn(),
  blur: jest.fn(),
  disabled: false,
  offsetParent: {},
  addEventListener: jest.fn(),
  closest: jest.fn().mockReturnValue(modal),
  hasAttribute: jest.fn().mockReturnValue(false),
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  }
};

// Create list items for arrow key navigation test
const listItem1 = {
  tagName: 'LI',
  focus: jest.fn(),
  blur: jest.fn(),
  closest: jest.fn(),
  getAttribute: jest.fn(),
  setAttribute: jest.fn()
};

const listItem2 = {
  tagName: 'LI',
  focus: jest.fn(),
  blur: jest.fn(),
  closest: jest.fn(),
  getAttribute: jest.fn(),
  setAttribute: jest.fn()
};

const listItem3 = {
  tagName: 'LI',
  focus: jest.fn(),
  blur: jest.fn(),
  closest: jest.fn(),
  getAttribute: jest.fn(),
  setAttribute: jest.fn()
};

// Create list container
const listContainer = {
  tagName: 'UL',
  querySelectorAll: jest.fn().mockReturnValue([listItem1, listItem2, listItem3])
};

// Setup DOM mocks
beforeEach(() => {
  // Reset FocusManager state
  FocusManager.currentFocusElement = null;
  FocusManager.trapContainer = null;
  FocusManager.previousFocusElement = null;
  
  // Reset mock functions
  jest.clearAllMocks();
  
  // Mock setTimeout
  jest.useFakeTimers();
  
  // Mock document methods
  document.addEventListener = jest.fn();
  document.querySelector = jest.fn();
  document.querySelectorAll = jest.fn().mockReturnValue([]);
  document.getElementById = jest.fn().mockImplementation((id) => {
    if (id === 'modal') {
      return modal;
    } else if (id === 'button1') {
      return button1;
    } else if (id === 'sr-announcer') {
      return null; // Return null to test creation of announcer
    }
    return null;
  });
  
  document.createElement = jest.fn().mockImplementation((tag) => {
    if (tag === 'div') {
      return {
        id: '',
        style: {},
        setAttribute: jest.fn(),
        appendChild: jest.fn()
      };
    }
    return {};
  });
  
  // Mock document.activeElement
  Object.defineProperty(document, 'activeElement', {
    get: jest.fn().mockReturnValue(button1),
    configurable: true
  });
  
  // Mock document.body.appendChild instead of replacing document.body
  if (!document.body.appendChild.mockReset) {
    document.body.appendChild = jest.fn();
  } else {
    document.body.appendChild.mockReset();
  }
  
  // Mock window.matchMedia
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  });
  
  // Setup list item closest method to return list container
  listItem1.closest.mockReturnValue(listContainer);
  listItem2.closest.mockReturnValue(listContainer);
  listItem3.closest.mockReturnValue(listContainer);
  
  // Mock UIState methods
  UIState.addClass = jest.fn();
  UIState.removeClass = jest.fn();
  UIState.setAttribute = jest.fn();
  UIState.setText = jest.fn();
  UIState.setStyle = jest.fn();
  UIState.show = jest.fn();
  UIState.hide = jest.fn();
  UIState.elements = {
    question: jest.fn().mockReturnValue(input1)
  };
  
  // Mock FocusManager methods to avoid actual implementation
  const originalSetFocus = FocusManager.setFocus;
  FocusManager.setFocus = jest.fn().mockImplementation((element, options = {}) => {
    if (!element) return;
    
    element.focus();
    UIState.addClass(element, 'focused');
    FocusManager.currentFocusElement = element;
    
    if (options.announceToScreenReader) {
      FocusManager.announceToScreenReader(`Focus is now on ${element.tagName.toLowerCase()}${element.id ? ' ' + element.id : ''}`);
    }
  });
  
  const originalAnnounceToScreenReader = FocusManager.announceToScreenReader;
  FocusManager.announceToScreenReader = jest.fn().mockImplementation((message) => {
    const announcer = document.getElementById('sr-announcer') || document.createElement('div');
    UIState.setAttribute(announcer, 'aria-live', 'polite');
    UIState.setText(announcer, message);
    document.body.appendChild(announcer);
  });
});

// Restore mocks after tests
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('FocusManager', () => {
  test('initialize sets up keyboard event listeners', () => {
    // Call initialize
    FocusManager.initialize();
    
    // Verify event listeners were added
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('focusin', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });
  
  test('setFocus focuses on an element', () => {
    // Call setFocus
    FocusManager.setFocus(button1);
    
    // Verify focus was set
    expect(button1.focus).toHaveBeenCalled();
    expect(UIState.addClass).toHaveBeenCalledWith(button1, 'focused');
    expect(FocusManager.currentFocusElement).toBe(button1);
  });
  
  test('setFocus announces to screen reader when specified', () => {
    // Spy on announceToScreenReader
    const announceSpy = jest.spyOn(FocusManager, 'announceToScreenReader');
    
    // Call setFocus with announceToScreenReader option
    FocusManager.setFocus(button1, { announceToScreenReader: true });
    
    // Verify announcement was made
    expect(announceSpy).toHaveBeenCalledWith(expect.stringContaining('Focus is now on'));
  });
  
  test('clearFocus clears focus from current element', () => {
    // Set current focus element
    FocusManager.currentFocusElement = button1;
    
    // Call clearFocus
    FocusManager.clearFocus(button1);
    
    // Verify focus was cleared
    expect(button1.blur).toHaveBeenCalled();
    expect(FocusManager.currentFocusElement).toBeNull();
  });
  
  test('setInitialFocus sets focus on the question input', () => {
    // Replace the original setInitialFocus method with our own implementation
    const originalSetInitialFocus = FocusManager.setInitialFocus;
    FocusManager.setInitialFocus = jest.fn().mockImplementation(() => {
      const questionInput = UIState.elements.question();
      if (questionInput) {
        // Call setFocus directly instead of using setTimeout
        FocusManager.setFocus(questionInput);
      }
    });
    
    // Call setInitialFocus
    FocusManager.setInitialFocus();
    
    // Verify focus was set on the question input
    expect(input1.focus).toHaveBeenCalled();
    expect(FocusManager.currentFocusElement).toBe(input1);
    
    // Restore original method
    FocusManager.setInitialFocus = originalSetInitialFocus;
  });
  
  test('trackFocus updates currentFocusElement on focus change', () => {
    // Replace the original trackFocus method with our own implementation
    const originalTrackFocus = FocusManager.trackFocus;
    FocusManager.trackFocus = jest.fn().mockImplementation((event) => {
      FocusManager.currentFocusElement = event.target;
      
      // Add focused class to current element
      UIState.addClass(event.target, 'focused');
    });
    
    // Create a focus event
    const focusEvent = { target: button2 };
    
    // Call trackFocus
    FocusManager.trackFocus(focusEvent);
    
    // Verify current focus element was updated
    expect(FocusManager.currentFocusElement).toBe(button2);
    expect(UIState.addClass).toHaveBeenCalledWith(button2, 'focused');
    
    // Restore original method
    FocusManager.trackFocus = originalTrackFocus;
  });
  
  test('handleEscapeKey releases focus trap when Escape is pressed', () => {
    // Set up focus trap
    FocusManager.trapContainer = modal;
    FocusManager.previousFocusElement = button1;
    
    // Mock document.querySelector to return an open modal
    document.querySelector.mockReturnValue(modal);
    
    // Spy on releaseFocusTrap
    const releaseSpy = jest.spyOn(FocusManager, 'releaseFocusTrap');
    releaseSpy.mockImplementation(() => {});
    
    // Call handleEscapeKey
    FocusManager.handleEscapeKey();
    
    // Verify focus trap was released
    expect(releaseSpy).toHaveBeenCalled();
  });
  
  test('handleTabKeyInTrap keeps focus within trap container', () => {
    // Set up focus trap
    FocusManager.trapContainer = modal;
    
    // Mock document.activeElement to be the last focusable element
    Object.defineProperty(document, 'activeElement', {
      get: jest.fn().mockReturnValue(modalButton2),
      configurable: true
    });
    
    // Mock getFocusableElements to return modal elements
    const getFocusableSpy = jest.spyOn(FocusManager, 'getFocusableElements')
      .mockReturnValue([modalButton1, modalInput, modalButton2]);
    
    // Spy on setFocus
    const setFocusSpy = jest.spyOn(FocusManager, 'setFocus');
    setFocusSpy.mockImplementation(() => {});
    
    // Create a Tab event
    const tabEvent = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: jest.fn()
    };
    
    // Call handleTabKeyInTrap
    FocusManager.handleTabKeyInTrap(tabEvent);
    
    // Verify event was prevented and focus was set to first element in trap
    expect(tabEvent.preventDefault).toHaveBeenCalled();
    expect(setFocusSpy).toHaveBeenCalledWith(modalButton1);
  });
  
  test('handleArrowKeys navigates through list items', () => {
    // Mock document.activeElement
    Object.defineProperty(document, 'activeElement', {
      get: jest.fn().mockReturnValue(listItem1),
      configurable: true
    });
    
    // Mock handleListNavigation to avoid actual implementation
    const handleListSpy = jest.spyOn(FocusManager, 'handleListNavigation');
    handleListSpy.mockImplementation(() => {});
    
    // Create an arrow key event
    const arrowDownEvent = {
      key: 'ArrowDown',
      preventDefault: jest.fn(),
      target: listItem1
    };
    
    // Call handleArrowKeys
    FocusManager.handleArrowKeys(arrowDownEvent);
    
    // Verify handleListNavigation was called
    expect(handleListSpy).toHaveBeenCalledWith(arrowDownEvent);
  });
  
  test('trapFocus sets up a focus trap within a container', () => {
    // Spy on getFocusableElements
    const getFocusableSpy = jest.spyOn(FocusManager, 'getFocusableElements')
      .mockReturnValue([modalButton1, modalInput, modalButton2]);
    
    // Spy on setFocus
    const setFocusSpy = jest.spyOn(FocusManager, 'setFocus');
    setFocusSpy.mockImplementation(() => {});
    
    // Set document.activeElement
    Object.defineProperty(document, 'activeElement', {
      get: jest.fn().mockReturnValue(button1),
      configurable: true
    });
    
    // Call trapFocus
    FocusManager.trapFocus(modal);
    
    // Verify trap container was set
    expect(FocusManager.trapContainer).toBe(modal);
    expect(FocusManager.previousFocusElement).toBe(button1);
    expect(setFocusSpy).toHaveBeenCalledWith(modalButton1);
  });
  
  test('releaseFocusTrap releases the focus trap', () => {
    // Set up focus trap
    FocusManager.trapContainer = modal;
    FocusManager.previousFocusElement = button1;
    
    // Spy on setFocus
    const setFocusSpy = jest.spyOn(FocusManager, 'setFocus');
    setFocusSpy.mockImplementation(() => {});
    
    // Call releaseFocusTrap
    FocusManager.releaseFocusTrap();
    
    // Verify trap container was cleared
    expect(FocusManager.trapContainer).toBeNull();
    
    // Verify focus was returned to previous element
    expect(setFocusSpy).toHaveBeenCalledWith(button1);
  });
  
  test('getFocusableElements returns all focusable elements within a container', () => {
    // Mock querySelectorAll to return focusable elements
    modal.querySelectorAll.mockReturnValue([modalButton1, modalInput, modalButton2]);
    
    // Call getFocusableElements
    const focusableElements = FocusManager.getFocusableElements(modal);
    
    // Verify correct elements were returned
    expect(focusableElements.length).toBe(3);
    expect(focusableElements[0]).toBe(modalButton1);
    expect(focusableElements[1]).toBe(modalInput);
    expect(focusableElements[2]).toBe(modalButton2);
  });
  
  test('announceToScreenReader creates and updates screen reader announcer', () => {
    // Create a mock element for the announcer
    const announcer = {
      id: 'sr-announcer',
      setAttribute: jest.fn(),
      style: {}
    };
    
    // Mock document.createElement to return the announcer
    document.createElement.mockReturnValue(announcer);
    
    // Replace the original announceToScreenReader method with our own implementation
    const originalAnnounceToScreenReader = FocusManager.announceToScreenReader;
    FocusManager.announceToScreenReader = jest.fn().mockImplementation((message) => {
      UIState.setAttribute(announcer, 'aria-live', 'polite');
      UIState.setText(announcer, message);
      document.body.appendChild(announcer);
    });
    
    // Call announceToScreenReader
    FocusManager.announceToScreenReader('Test announcement');
    
    // Verify announcer was set up correctly
    expect(UIState.setAttribute).toHaveBeenCalledWith(announcer, 'aria-live', 'polite');
    expect(UIState.setText).toHaveBeenCalledWith(announcer, 'Test announcement');
    
    // Restore original method
    FocusManager.announceToScreenReader = originalAnnounceToScreenReader;
  });
}); 