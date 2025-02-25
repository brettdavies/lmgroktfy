/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { ClipboardManager } from '../../js/managers/ClipboardManager.js';

// Import the actual UIState module and then mock its methods
import { UIState } from '../../js/managers/UIState.js';

describe('ClipboardManager', () => {
  const text = 'Test message';
  const message = 'Test text';
  
  // Create mock elements with innerText properties
  const mockQuestionElement = { innerText: 'Test question' };
  const mockAnswerElement = { innerText: 'Test answer' };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up DOM for visual verification
    document.body.innerHTML = `
      <div id="question">Test question</div>
      <div id="answer">Test answer</div>
    `;
    
    // Mock UIState methods
    UIState.showToast = jest.fn();
    UIState.elements = {
      questionDisplay: jest.fn().mockReturnValue(mockQuestionElement),
      answer: jest.fn().mockReturnValue(mockAnswerElement)
    };
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined)
      },
      configurable: true
    });
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://lmgroktfy.com/test'
      },
      configurable: true
    });
  });
  
  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  test('copyText should copy text to clipboard and show toast', async () => {
    await ClipboardManager.copyText(text, message);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
    expect(UIState.showToast).toHaveBeenCalledWith(message);
  });

  test('getShareableText should format text for qa type', () => {
    const result = ClipboardManager.getShareableText('qa');
    
    expect(result).toContain('Test question');
    expect(result).toContain('Test answer');
    expect(result).toContain('Answer by Grok');
  });

  test('getShareableText should format text for answer type', () => {
    const result = ClipboardManager.getShareableText('answer');
    
    expect(result).not.toContain('Test question');
    expect(result).toContain('Test answer');
    expect(result).toContain('Answer by Grok');
  });

  test('getShareableText should return URL for url type', () => {
    const result = ClipboardManager.getShareableText('url');
    
    expect(result).toBe('https://lmgroktfy.com/test');
  });

  test('getShareableText should return encoded URL for shareUrl type', () => {
    const result = ClipboardManager.getShareableText('shareUrl');
    
    expect(result).toBe(encodeURIComponent('https://lmgroktfy.com/test'));
  });

  test('getShareableText should format text for tweet type', () => {
    const result = ClipboardManager.getShareableText('tweet');
    
    expect(result).toContain('Test question');
    expect(result).toContain('Test answer');
    expect(result).toContain('Answer by Grok');
    expect(result).not.toContain('via lmgroktfy.com');
  });

  test('getShareableText should return empty string for invalid type', () => {
    const result = ClipboardManager.getShareableText('invalid');
    
    expect(result).toBe('');
  });
}); 