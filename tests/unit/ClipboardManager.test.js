/**
 * @jest-environment jsdom
 */

// Mock UIState before importing ClipboardManager
jest.mock('../../js/managers/UIState.js', () => ({
  UIState: {
    elements: {
      questionDisplay: jest.fn(),
      answer: jest.fn()
    },
    showToast: jest.fn()
  }
}));

// Import the ClipboardManager module
import { ClipboardManager } from '../../js/managers/ClipboardManager.js';
import { UIState } from '../../js/managers/UIState.js';

describe('ClipboardManager', () => {
  // Create mock elements with innerText properties
  const mockQuestionElement = { innerText: 'Test question' };
  const mockAnswerElement = { innerText: 'Test answer' };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup DOM for visual verification, but we'll use our mocks for the actual tests
    document.body.innerHTML = `
      <div id="question-display">Test question</div>
      <div id="answer">Test answer</div>
    `;
    
    // Setup mock implementations to return our mock elements
    UIState.elements.questionDisplay.mockReturnValue(mockQuestionElement);
    UIState.elements.answer.mockReturnValue(mockAnswerElement);
    
    // Mock window.location
    delete window.location;
    window.location = { href: 'https://lmgroktfy.com/Test%20question' };

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve())
      },
      configurable: true
    });
  });

  test('copyText should copy text to clipboard and show toast', async () => {
    const text = 'Test text';
    const message = 'Test message';
    
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
    
    expect(result).toBe('https://lmgroktfy.com/Test%20question');
  });

  test('getShareableText should return encoded URL for shareUrl type', () => {
    const result = ClipboardManager.getShareableText('shareUrl');
    
    expect(result).toBe(encodeURIComponent('https://lmgroktfy.com/Test%20question'));
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