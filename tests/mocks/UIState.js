import { jest } from '@jest/globals';

// Create a mock UIState object
export const UIState = {
  addClass: jest.fn(),
  removeClass: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  setAriaAttribute: jest.fn(),
  removeAriaAttribute: jest.fn(),
  hasClass: jest.fn(),
  getTheme: jest.fn(),
  setTheme: jest.fn(),
  setText: jest.fn(),
  getText: jest.fn(),
  getElement: jest.fn(),
  getAllElements: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  createEvent: jest.fn(),
  setStyle: jest.fn(),
  // Additional methods needed for PlaceholderManager
  setOpacity: jest.fn(),
  setSubmitButtonState: jest.fn(),
  updatePlaceholderVisibility: jest.fn(),
  enhanceForTouch: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  // Additional methods needed for AnimationManager
  removeStyle: jest.fn(),
  elements: {
    question: jest.fn()
  }
}; 