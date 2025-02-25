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
  <div id="question-input"></div>
  <div id="custom-placeholder"></div>
  <div id="submit-button"></div>
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
    
    // Reset window inner width for viewport tests
    global.innerWidth = 1024;
    
    // Clear any classes added during tests
    document.body.className = '';
    document.getElementById('question-input').className = '';
    document.getElementById('custom-placeholder').className = '';
    document.getElementById('submit-button').className = '';
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
  
  // Tests for new methods
  
  test('setText should set text content of an element', () => {
    const element = document.getElementById('answer');
    const text = 'New text content';
    
    UIState.setText(element, text);
    
    expect(element.textContent).toBe(text);
  });
  
  test('setHtml should set HTML content of an element', () => {
    const element = document.getElementById('answer');
    const html = '<em>Emphasized text</em>';
    
    UIState.setHtml(element, html);
    
    expect(element.innerHTML).toBe(html);
  });
  
  test('addClass should add a class to an element', () => {
    const element = document.getElementById('answer');
    
    UIState.addClass(element, 'test-class');
    
    expect(element.classList.contains('test-class')).toBe(true);
  });
  
  test('removeClass should remove a class from an element', () => {
    const element = document.getElementById('answer');
    element.classList.add('test-class');
    
    UIState.removeClass(element, 'test-class');
    
    expect(element.classList.contains('test-class')).toBe(false);
  });
  
  test('toggleClass should toggle a class on an element', () => {
    const element = document.getElementById('answer');
    
    // Toggle on
    UIState.toggleClass(element, 'test-class');
    expect(element.classList.contains('test-class')).toBe(true);
    
    // Toggle off
    UIState.toggleClass(element, 'test-class');
    expect(element.classList.contains('test-class')).toBe(false);
    
    // Toggle with force parameter
    UIState.toggleClass(element, 'test-class', true);
    expect(element.classList.contains('test-class')).toBe(true);
  });
  
  test('setAttribute should set an attribute on an element', () => {
    const element = document.getElementById('answer');
    
    UIState.setAttribute(element, 'data-test', 'test-value');
    
    expect(element.getAttribute('data-test')).toBe('test-value');
  });
  
  test('removeAttribute should remove an attribute from an element', () => {
    const element = document.getElementById('answer');
    element.setAttribute('data-test', 'test-value');
    
    UIState.removeAttribute(element, 'data-test');
    
    expect(element.hasAttribute('data-test')).toBe(false);
  });
  
  test('setStyle should set a style property on an element', () => {
    const element = document.getElementById('answer');
    
    UIState.setStyle(element, 'color', 'red');
    
    expect(element.style.color).toBe('red');
  });
  
  // Mobile optimization tests
  
  test('adjustForViewport should apply mobile layout when isMobile is true', () => {
    // Mock setMobileLayout and setDesktopLayout
    const setMobileLayoutSpy = jest.spyOn(UIState, 'setMobileLayout');
    const setDesktopLayoutSpy = jest.spyOn(UIState, 'setDesktopLayout');
    
    // Test mobile
    UIState.adjustForViewport(true);
    expect(setMobileLayoutSpy).toHaveBeenCalled();
    expect(setDesktopLayoutSpy).not.toHaveBeenCalled();
    
    // Reset mocks
    setMobileLayoutSpy.mockClear();
    setDesktopLayoutSpy.mockClear();
    
    // Test desktop
    UIState.adjustForViewport(false);
    expect(setMobileLayoutSpy).not.toHaveBeenCalled();
    expect(setDesktopLayoutSpy).toHaveBeenCalled();
    
    // Restore original methods
    setMobileLayoutSpy.mockRestore();
    setDesktopLayoutSpy.mockRestore();
  });
  
  test('setMobileLayout should apply mobile-specific classes', () => {
    const questionInput = document.getElementById('question-input');
    const submitButton = document.getElementById('submit-button');
    
    // Mock the buttons collection to include the submit button
    UIState.elements.buttons.submit = jest.fn().mockReturnValue(submitButton);
    
    UIState.setMobileLayout();
    
    expect(document.body.classList.contains('mobile-view')).toBe(true);
    expect(questionInput.classList.contains('mobile-input')).toBe(true);
    expect(submitButton.classList.contains('touch-target')).toBe(true);
  });
  
  test('setDesktopLayout should remove mobile-specific classes', () => {
    // Set up initial state with mobile classes
    const questionInput = document.getElementById('question-input');
    const submitButton = document.getElementById('submit-button');
    document.body.classList.add('mobile-view');
    questionInput.classList.add('mobile-input');
    submitButton.classList.add('touch-target');
    
    // Mock the buttons collection to include the submit button
    UIState.elements.buttons.submit = jest.fn().mockReturnValue(submitButton);
    
    UIState.setDesktopLayout();
    
    expect(document.body.classList.contains('mobile-view')).toBe(false);
    expect(questionInput.classList.contains('mobile-input')).toBe(false);
    expect(submitButton.classList.contains('touch-target')).toBe(false);
  });
  
  test('checkViewport should call adjustForViewport with correct parameter', () => {
    // Mock adjustForViewport
    const adjustForViewportSpy = jest.spyOn(UIState, 'adjustForViewport');
    
    // Test desktop viewport
    global.innerWidth = 1024;
    UIState.checkViewport();
    expect(adjustForViewportSpy).toHaveBeenCalledWith(false);
    
    // Reset mock
    adjustForViewportSpy.mockClear();
    
    // Test mobile viewport
    global.innerWidth = 375;
    UIState.checkViewport();
    expect(adjustForViewportSpy).toHaveBeenCalledWith(true);
    
    // Restore original method
    adjustForViewportSpy.mockRestore();
  });
  
  test('enhanceForTouch should apply touch-specific styles', () => {
    const element = document.getElementById('submit-button');
    
    UIState.enhanceForTouch(element);
    
    expect(element.style.touchAction).toBe('manipulation');
    expect(element.classList.contains('active:bg-opacity-70')).toBe(true);
    expect(element.classList.contains('transition-transform')).toBe(true);
    expect(element.classList.contains('active:scale-95')).toBe(true);
  });
  
  test('initViewportHandling should set up viewport detection', () => {
    // Mock checkViewport
    const checkViewportSpy = jest.spyOn(UIState, 'checkViewport');
    
    // Mock addEventListener
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    UIState.initViewportHandling();
    
    expect(checkViewportSpy).toHaveBeenCalled();
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    
    // Restore original methods
    checkViewportSpy.mockRestore();
    addEventListenerSpy.mockRestore();
  });
  
  // Edge case tests
  
  test('UIState methods handle null elements gracefully', () => {
    // Should not throw errors when elements are null
    UIState.show(null);
    UIState.hide(null);
    UIState.setOpacity(null, 0.5);
    UIState.setText(null, 'text');
    UIState.setHtml(null, '<em>text</em>');
    UIState.addClass(null, 'class');
    UIState.removeClass(null, 'class');
    UIState.toggleClass(null, 'class');
    UIState.setAttribute(null, 'attr', 'value');
    UIState.removeAttribute(null, 'attr');
    UIState.setStyle(null, 'property', 'value');
    UIState.enhanceForTouch(null);
    
    // Test passed if no exceptions were thrown
    expect(true).toBe(true);
  });
  
  test('updatePlaceholderVisibility handles all combinations of inputs', () => {
    // Create a test matrix of all possible combinations
    const testCases = [
      { value: '', isFocused: false, hasUrlQuestion: false, expectedOpacity: '1' },
      { value: '', isFocused: true, hasUrlQuestion: false, expectedOpacity: '0' },
      { value: 'text', isFocused: false, hasUrlQuestion: false, expectedOpacity: '0' },
      { value: 'text', isFocused: true, hasUrlQuestion: false, expectedOpacity: '0' },
      { value: '', isFocused: false, hasUrlQuestion: true, expectedOpacity: '0' },
      { value: '', isFocused: true, hasUrlQuestion: true, expectedOpacity: '0' },
      { value: 'text', isFocused: false, hasUrlQuestion: true, expectedOpacity: '0' },
      { value: 'text', isFocused: true, hasUrlQuestion: true, expectedOpacity: '0' },
    ];
    
    testCases.forEach(({ value, isFocused, hasUrlQuestion, expectedOpacity }) => {
      // Reset DOM for each test case
      document.body.innerHTML = `
        <input id="question-input" />
        <div id="custom-placeholder"></div>
        <button id="submit-button"></button>
      `;
      
      // Test
      UIState.updatePlaceholderVisibility(value, isFocused, hasUrlQuestion);
      
      // Verify
      expect(document.getElementById('custom-placeholder').style.opacity).toBe(expectedOpacity);
    });
  });
}); 