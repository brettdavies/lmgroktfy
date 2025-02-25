/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { AnimationManager } from '../../js/managers/AnimationManager.js';
import { UIState } from '../mocks/UIState.js';

describe('AnimationManager', () => {
  // Save original methods
  const originalMatchMedia = window.matchMedia;
  const originalGetComputedStyle = window.getComputedStyle;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create test DOM structure
    document.body.innerHTML = `
      <div id="app">
        <div id="animated-element"></div>
        <div id="transition-element"></div>
        <ul id="stagger-list">
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </div>
    `;
    
    // Mock matchMedia
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: jest.fn()
    });
    
    // Mock getComputedStyle
    window.getComputedStyle = jest.fn().mockReturnValue({
      transitionDuration: '0.3s'
    });
    
    // Mock requestAnimationFrame
    window.requestAnimationFrame = jest.fn(callback => callback());
    
    // Reset AnimationManager state
    AnimationManager.prefersReducedMotion = false;
    
    // Mock setTimeout
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.useRealTimers();
    
    // Restore original methods
    window.matchMedia = originalMatchMedia;
    window.getComputedStyle = originalGetComputedStyle;
    window.requestAnimationFrame = originalRequestAnimationFrame;
  });
  
  test('initialize sets up event listeners and checks user preferences', () => {
    // Spy on methods that are called during initialization
    const checkReducedMotionSpy = jest.spyOn(AnimationManager, 'checkReducedMotionPreference');
    
    // Initialize the AnimationManager
    AnimationManager.initialize();
    
    // Verify checkReducedMotionPreference was called
    expect(checkReducedMotionSpy).toHaveBeenCalled();
    
    // Verify matchMedia was called with correct query
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    
    // Verify event listener was added
    expect(window.matchMedia().addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    
    // Restore original methods
    checkReducedMotionSpy.mockRestore();
  });
  
  test('checkReducedMotionPreference detects user preference', () => {
    // Test with reduced motion preference disabled
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)'
    });
    
    AnimationManager.checkReducedMotionPreference();
    expect(AnimationManager.prefersReducedMotion).toBe(false);
    
    // Test with reduced motion preference enabled
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)'
    });
    
    AnimationManager.checkReducedMotionPreference();
    expect(AnimationManager.prefersReducedMotion).toBe(true);
  });
  
  test('stopAnimation does nothing when element is not found', () => {
    // Mock UIState methods
    const originalRemoveClass = UIState.removeClass;
    const originalSetStyle = UIState.setStyle;
    const originalRemoveStyle = UIState.removeStyle;
    
    UIState.removeClass = jest.fn();
    UIState.setStyle = jest.fn();
    UIState.removeStyle = jest.fn();
    
    // Call stopAnimation with null element
    AnimationManager.stopAnimation(null);
    
    // Verify UIState methods were not called
    expect(UIState.removeClass).not.toHaveBeenCalled();
    expect(UIState.setStyle).not.toHaveBeenCalled();
    expect(UIState.removeStyle).not.toHaveBeenCalled();
    
    // Restore original methods
    UIState.removeClass = originalRemoveClass;
    UIState.setStyle = originalSetStyle;
    UIState.removeStyle = originalRemoveStyle;
  });
}); 