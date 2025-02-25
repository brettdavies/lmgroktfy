/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { ThemeManager } from '../../js/managers/ThemeManager.js';
import { UIState } from '../../tests/mocks/UIState.js';

describe('ThemeManager', () => {
  // Save original document properties
  const originalDocumentElementClassList = document.documentElement.classList;
  const originalDocumentElementSetAttribute = document.documentElement.setAttribute;
  const originalBodyClassList = document.body.classList;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset ThemeManager state
    ThemeManager.currentTheme = null;
    
    // Mock document.documentElement.classList
    document.documentElement.classList = {
      contains: jest.fn(),
      add: jest.fn(),
      remove: jest.fn()
    };
    
    // Mock document.documentElement.setAttribute
    document.documentElement.setAttribute = jest.fn();
    
    // Mock document.body.classList
    document.body.classList = {
      contains: jest.fn(),
      add: jest.fn(),
      remove: jest.fn()
    };
  });
  
  afterEach(() => {
    // Restore original document properties
    document.documentElement.classList = originalDocumentElementClassList;
    document.documentElement.setAttribute = originalDocumentElementSetAttribute;
    document.body.classList = originalBodyClassList;
  });
  
  test('initialize sets up theme based on system preference', () => {
    // Mock document.getElementById
    document.getElementById = jest.fn().mockImplementation(id => {
      if (id === 'theme-toggle') {
        return {
          addEventListener: jest.fn(),
          setAttribute: jest.fn()
        };
      } else if (id === 'theme-selector') {
        return {
          addEventListener: jest.fn(),
          setAttribute: jest.fn()
        };
      }
      return null;
    });
    
    // Mock window.matchMedia
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
    }));
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Spy on ThemeManager methods
    const setThemeSpy = jest.spyOn(ThemeManager, 'setTheme');
    
    // Initialize ThemeManager
    ThemeManager.initialize();
    
    // Verify localStorage was checked
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
    
    // Verify setTheme was called with system theme
    expect(setThemeSpy).toHaveBeenCalledWith(ThemeManager.themes.SYSTEM);
    
    // Restore spy
    setThemeSpy.mockRestore();
  });
  
  test('toggleTheme switches between light and dark themes', () => {
    // Mock getTheme to return light theme
    const originalGetTheme = ThemeManager.getTheme;
    ThemeManager.getTheme = jest.fn().mockReturnValue(ThemeManager.themes.LIGHT);
    
    // Mock setTheme
    const originalSetTheme = ThemeManager.setTheme;
    ThemeManager.setTheme = jest.fn();
    
    // Toggle theme (should switch to dark)
    ThemeManager.toggleTheme();
    
    // Verify setTheme was called with dark theme
    expect(ThemeManager.setTheme).toHaveBeenCalledWith(ThemeManager.themes.DARK);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock getTheme to return dark theme
    ThemeManager.getTheme = jest.fn().mockReturnValue(ThemeManager.themes.DARK);
    
    // Toggle theme (should switch to light)
    ThemeManager.toggleTheme();
    
    // Verify setTheme was called with light theme
    expect(ThemeManager.setTheme).toHaveBeenCalledWith(ThemeManager.themes.LIGHT);
    
    // Restore original methods
    ThemeManager.getTheme = originalGetTheme;
    ThemeManager.setTheme = originalSetTheme;
  });
}); 