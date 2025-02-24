/**
 * @jest-environment jsdom
 */

// Mock the DOM elements that UIState interacts with
document.body.innerHTML = `
  <div id="loading" class="hidden"></div>
  <div id="response" class="hidden"></div>
  <div id="question-form"></div>
  <div id="answer"></div>
  <div id="question-display"></div>
  <div id="toast" class="hidden"></div>
  <div id="toast-message"></div>
  <div id="continue-link"></div>
  <div id="use-grok-button"></div>
  <div id="share-button"></div>
  <div id="copy-question-answer-button"></div>
  <div id="copy-answer-button"></div>
  <div id="share-on-x-button"></div>
`;

// Import the UIState module
import { UIState } from '../../js/managers/UIState.js';

describe('UIState', () => {
  // Reset DOM before each test
  beforeEach(() => {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('response').classList.add('hidden');
    document.getElementById('question-form').classList.remove('hidden');
    document.getElementById('answer').innerText = '';
    document.getElementById('question-display').innerText = '';
  });

  test('showLoading should show loading and hide response', () => {
    UIState.showLoading();
    
    expect(document.getElementById('loading').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('response').classList.contains('hidden')).toBe(true);
  });

  test('hideLoading should hide loading', () => {
    document.getElementById('loading').classList.remove('hidden');
    
    UIState.hideLoading();
    
    expect(document.getElementById('loading').classList.contains('hidden')).toBe(true);
  });

  test('showError should display error message and hide buttons', () => {
    const question = 'Test question';
    
    UIState.showError(question);
    
    expect(document.getElementById('question-form').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('question-display').innerText).toBe(question);
    expect(document.getElementById('answer').innerText).toBe('Oops, something went wrong!');
    expect(document.getElementById('response').classList.contains('hidden')).toBe(false);
  });

  test('showSuccess should display answer and update UI', () => {
    const answer = 'Test answer';
    const question = 'Test question';
    
    UIState.showSuccess(answer, question);
    
    expect(document.getElementById('question-form').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('question-display').innerText).toBe(question);
    expect(document.getElementById('answer').innerText).toBe(answer);
    expect(document.getElementById('response').classList.contains('hidden')).toBe(false);
  });

  test('showToast should display toast with message', () => {
    const message = 'Test toast message';
    
    // Mock setTimeout
    jest.useFakeTimers();
    
    UIState.showToast(message);
    
    expect(document.getElementById('toast').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('toast-message').textContent).toBe(message);
    
    // Fast-forward timers
    jest.runAllTimers();
    
    expect(document.getElementById('toast').classList.contains('hidden')).toBe(true);
    
    // Restore timers
    jest.useRealTimers();
  });

  test('updateGrokButtons should update button URLs', () => {
    const question = 'Test question';
    
    UIState.updateGrokButtons(question);
    
    expect(document.getElementById('continue-link').href).toContain(question);
    expect(document.getElementById('use-grok-button').href).toContain(question);
  });
}); 