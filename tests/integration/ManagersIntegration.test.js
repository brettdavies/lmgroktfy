/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost/"}
 */

// Import Jest globals
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Import modules first
import { ThemeManager } from '../../js/managers/ThemeManager.js';
import { FocusManager } from '../../js/managers/FocusManager.js';
import { AnimationManager } from '../../js/managers/AnimationManager.js';
import { UIState } from '../../js/managers/UIState.js';

// Mock modules
jest.mock('../../js/managers/UIState.js', () => ({
  UIState: {
    addClass: jest.fn(),
    removeClass: jest.fn(),
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    setStyle: jest.fn(),
    setText: jest.fn(),
    setAriaAttribute: jest.fn(),
    removeAriaAttribute: jest.fn(),
    elements: {
      question: jest.fn()
    }
  }
}));

describe('Managers Integration', () => {
  // Save original methods
  let originalDocumentAddEventListener;
  let originalDocumentDispatchEvent;
  let originalGetElementById;
  let originalMatchMedia;
  let originalLocalStorage;
  let originalCustomEvent;
  
  beforeEach(() => {
    // Save original methods
    originalDocumentAddEventListener = document.addEventListener;
    originalDocumentDispatchEvent = document.dispatchEvent;
    originalGetElementById = document.getElementById;
    originalMatchMedia = window.matchMedia;
    originalLocalStorage = window.localStorage;
    originalCustomEvent = window.CustomEvent;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Fix the UIState mock implementation
    UIState.setAttribute = jest.fn((element, name, value) => {
      if (element) {
        element.setAttribute(name, value);
      }
    });
    
    // Create test DOM structure
    document.body.innerHTML = `
      <div id="app">
        <button id="theme-toggle">🌙</button>
        <select id="theme-selector">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <input id="question-input" type="text" />
        <div id="modal" tabindex="-1">
          <button id="modal-button1">Modal Button 1</button>
          <input id="modal-input" type="text" />
          <button id="modal-button2">Modal Button 2</button>
        </div>
        <div id="animated-element"></div>
      </div>
    `;
    
    // Mock document methods
    document.addEventListener = jest.fn();
    document.dispatchEvent = jest.fn();
    
    // Create spies for element methods
    const elements = {
      themeToggle: document.querySelector('#theme-toggle'),
      themeSelector: document.querySelector('#theme-selector'),
      questionInput: document.querySelector('#question-input'),
      modal: document.querySelector('#modal'),
      modalButton1: document.querySelector('#modal-button1'),
      modalInput: document.querySelector('#modal-input'),
      modalButton2: document.querySelector('#modal-button2'),
      animatedElement: document.querySelector('#animated-element')
    };
    
    // Add mock methods to elements
    Object.values(elements).forEach(el => {
      if (el) {
        el.focus = jest.fn();
        el.blur = jest.fn();
        el.addEventListener = jest.fn();
      }
    });
    
    // Mock getElementById to return elements with mocked methods
    document.getElementById = jest.fn().mockImplementation(id => {
      if (elements[id]) {
        return elements[id];
      }
      
      if (id === 'sr-announcer') {
        const announcer = document.createElement('div');
        document.body.appendChild(announcer);
        return announcer;
      }
      
      return document.querySelector(`#${id}`);
    });
    
    // Mock matchMedia
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: jest.fn()
    });
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Mock CustomEvent
    window.CustomEvent = jest.fn().mockImplementation((type, options) => ({
      type,
      detail: options.detail
    }));
    
    // Mock getComputedStyle
    window.getComputedStyle = jest.fn().mockReturnValue({
      transitionDuration: '0.3s'
    });
    
    // Mock requestAnimationFrame
    window.requestAnimationFrame = jest.fn(callback => callback());
    
    // Mock UIState.elements.question to return questionInput
    UIState.elements.question.mockReturnValue(elements.questionInput);
    
    // Reset manager states
    ThemeManager.currentTheme = null;
    FocusManager.currentFocusElement = null;
    FocusManager.trapContainer = null;
    FocusManager.previousFocusElement = null;
    AnimationManager.prefersReducedMotion = false;
    
    // Mock setTimeout
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.useRealTimers();
    
    // Restore original methods
    document.addEventListener = originalDocumentAddEventListener;
    document.dispatchEvent = originalDocumentDispatchEvent;
    document.getElementById = originalGetElementById;
    window.matchMedia = originalMatchMedia;
    window.CustomEvent = originalCustomEvent;
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });
  
  test('ThemeManager and AnimationManager work together when changing themes', () => {
    // Initialize managers
    ThemeManager.initialize();
    AnimationManager.initialize();
    
    // Spy on AnimationManager.animate
    const animateSpy = jest.spyOn(AnimationManager, 'animate');
    animateSpy.mockResolvedValue(undefined);
    
    // Get animated element
    const animatedElement = document.getElementById('animated-element');
    
    // Simulate theme change with animation
    ThemeManager.setTheme(ThemeManager.themes.DARK);
    AnimationManager.animate(animatedElement, AnimationManager.animations.FADE_IN);
    
    // Verify theme was set
    expect(ThemeManager.currentTheme).toBe(ThemeManager.themes.DARK);
    expect(UIState.addClass).toHaveBeenCalledWith(document.body, 'dark-theme');
    
    // Verify animation was applied
    expect(animateSpy).toHaveBeenCalledWith(animatedElement, AnimationManager.animations.FADE_IN);
    
    // Restore spy
    animateSpy.mockRestore();
  });
  
  test('ThemeManager and FocusManager work together with modals', () => {
    // Initialize managers
    ThemeManager.initialize();
    FocusManager.initialize();
    
    // Get elements
    const modal = document.getElementById('modal');
    const modalButton1 = document.getElementById('modal-button1');
    
    // Spy on FocusManager.trapFocus
    const trapFocusSpy = jest.spyOn(FocusManager, 'trapFocus');
    trapFocusSpy.mockImplementation(() => {});
    
    // Spy on FocusManager.getFocusableElements
    const getFocusableSpy = jest.spyOn(FocusManager, 'getFocusableElements');
    getFocusableSpy.mockReturnValue([
      modalButton1,
      document.getElementById('modal-input'),
      document.getElementById('modal-button2')
    ]);
    
    // Simulate opening a modal with a specific theme
    ThemeManager.setTheme(ThemeManager.themes.DARK);
    FocusManager.trapFocus(modal);
    
    // Verify theme was set
    expect(ThemeManager.currentTheme).toBe(ThemeManager.themes.DARK);
    expect(UIState.addClass).toHaveBeenCalledWith(document.body, 'dark-theme');
    
    // Verify focus trap was set up
    expect(trapFocusSpy).toHaveBeenCalledWith(modal);
    
    // Restore spies
    trapFocusSpy.mockRestore();
    getFocusableSpy.mockRestore();
  });
  
  test('FocusManager and AnimationManager work together with animated focus changes', () => {
    // Initialize managers
    FocusManager.initialize();
    AnimationManager.initialize();
    
    // Get elements
    const questionInput = document.getElementById('question-input');
    
    // Spy on AnimationManager.animate
    const animateSpy = jest.spyOn(AnimationManager, 'animate');
    animateSpy.mockResolvedValue(undefined);
    
    // Simulate focusing an element with animation
    FocusManager.setFocus(questionInput);
    AnimationManager.animate(questionInput, AnimationManager.animations.PULSE);
    
    // Verify focus was set
    expect(questionInput.focus).toHaveBeenCalled();
    
    // Verify animation was applied
    expect(animateSpy).toHaveBeenCalledWith(questionInput, AnimationManager.animations.PULSE);
    
    // Restore spy
    animateSpy.mockRestore();
  });
  
  test('All managers work together in a complex interaction', () => {
    // Initialize all managers
    ThemeManager.initialize();
    FocusManager.initialize();
    AnimationManager.initialize();
    
    // Get elements
    const themeToggle = document.getElementById('theme-toggle');
    const questionInput = document.getElementById('question-input');
    const modal = document.getElementById('modal');
    
    // Spy on methods
    const setThemeSpy = jest.spyOn(ThemeManager, 'setTheme');
    const trapFocusSpy = jest.spyOn(FocusManager, 'trapFocus');
    const animateSpy = jest.spyOn(AnimationManager, 'animate');
    
    // Mock implementations
    setThemeSpy.mockImplementation(() => {});
    trapFocusSpy.mockImplementation(() => {});
    animateSpy.mockResolvedValue(undefined);
    
    // Simulate a complex interaction
    // 1. Change theme
    ThemeManager.setTheme(ThemeManager.themes.DARK);
    
    // 2. Focus on input with animation
    FocusManager.setFocus(questionInput);
    AnimationManager.animate(questionInput, AnimationManager.animations.PULSE);
    
    // 3. Open modal with focus trap
    FocusManager.trapFocus(modal);
    
    // Verify all interactions
    expect(setThemeSpy).toHaveBeenCalledWith(ThemeManager.themes.DARK);
    expect(questionInput.focus).toHaveBeenCalled();
    expect(animateSpy).toHaveBeenCalledWith(questionInput, AnimationManager.animations.PULSE);
    expect(trapFocusSpy).toHaveBeenCalledWith(modal);
    
    // Restore spies
    setThemeSpy.mockRestore();
    trapFocusSpy.mockRestore();
    animateSpy.mockRestore();
  });
}); 