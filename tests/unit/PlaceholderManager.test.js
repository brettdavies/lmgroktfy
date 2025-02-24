/**
 * @jest-environment jsdom
 */

// Mock the DOM elements that PlaceholderManager interacts with
document.body.innerHTML = `
  <input type="text" id="question-input" class="placeholder-hidden" />
  <button type="submit" id="submit-button" disabled></button>
  <div id="custom-placeholder"></div>
`;

// Mock window.location
delete window.location;
window.location = { pathname: '/' };

// Import the PlaceholderManager module
import { PlaceholderManager } from '../../js/managers/PlaceholderManager.js';

describe('PlaceholderManager', () => {
  // Reset DOM before each test
  beforeEach(() => {
    document.getElementById('question-input').value = '';
    document.getElementById('question-input').classList.add('placeholder-hidden');
    document.getElementById('submit-button').disabled = true;
    document.getElementById('custom-placeholder').style.opacity = '1';
    document.getElementById('custom-placeholder').textContent = '';
    
    // Reset window.location
    window.location.pathname = '/';
    
    // Clear any intervals
    if (PlaceholderManager.rotationInterval) {
      clearInterval(PlaceholderManager.rotationInterval);
    }
  });
  
  afterEach(() => {
    // Clean up any intervals
    if (PlaceholderManager.rotationInterval) {
      clearInterval(PlaceholderManager.rotationInterval);
    }
  });

  test('initialize should set up elements and event listeners', () => {
    PlaceholderManager.initialize();
    
    expect(PlaceholderManager.elements.input).toBe(document.getElementById('question-input'));
    expect(PlaceholderManager.elements.submitButton).toBe(document.getElementById('submit-button'));
    expect(PlaceholderManager.elements.customPlaceholder).toBe(document.getElementById('custom-placeholder'));
    expect(PlaceholderManager.hasUrlQuestion).toBe(false);
  });

  test('initialize should detect URL question', () => {
    // Set up URL with question
    window.location.pathname = '/test-question';
    
    PlaceholderManager.initialize();
    
    expect(PlaceholderManager.hasUrlQuestion).toBe(true);
    expect(PlaceholderManager.elements.customPlaceholder.style.opacity).toBe('0');
  });

  test('updatePlaceholderVisibility should show placeholder when input is empty', () => {
    PlaceholderManager.initialize();
    
    PlaceholderManager.updatePlaceholderVisibility('');
    
    expect(PlaceholderManager.elements.customPlaceholder.style.opacity).toBe('1');
    expect(PlaceholderManager.elements.input.classList.contains('placeholder-hidden')).toBe(true);
    expect(PlaceholderManager.elements.submitButton.disabled).toBe(true);
  });

  test('updatePlaceholderVisibility should hide placeholder when input has value', () => {
    PlaceholderManager.initialize();
    
    PlaceholderManager.updatePlaceholderVisibility('test value');
    
    expect(PlaceholderManager.elements.customPlaceholder.style.opacity).toBe('0');
    expect(PlaceholderManager.elements.input.classList.contains('placeholder-hidden')).toBe(false);
    expect(PlaceholderManager.elements.submitButton.disabled).toBe(false);
  });

  test('updatePlaceholder should rotate placeholder text', () => {
    PlaceholderManager.initialize();
    
    const initialPlaceholder = PlaceholderManager.elements.customPlaceholder.textContent;
    
    PlaceholderManager.updatePlaceholder();
    
    const newPlaceholder = PlaceholderManager.elements.customPlaceholder.textContent;
    
    expect(newPlaceholder).not.toBe(initialPlaceholder);
    expect(PlaceholderManager.currentIndex).toBe(1);
  });

  test('reset should reset placeholder state', () => {
    PlaceholderManager.initialize();
    PlaceholderManager.hasUrlQuestion = true;
    PlaceholderManager.currentIndex = 3;
    
    PlaceholderManager.reset();
    
    expect(PlaceholderManager.hasUrlQuestion).toBe(false);
    expect(PlaceholderManager.currentIndex).toBe(0);
    expect(PlaceholderManager.elements.customPlaceholder.textContent).toBe(PlaceholderManager.placeholders[0]);
  });
}); 