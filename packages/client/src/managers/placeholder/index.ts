import { i18n } from '../../i18n';
import { elements, setAttribute, setText, setSubmitButtonState } from '../../ui';
import { startRotation, stopRotation, updatePlaceholder } from './animation';
import { setupPlaceholderEvents } from './events';
import { initMobileSupport } from './responsive';
import { applyRTLPosition } from './rtl';
import { state } from './state';
import { hidePlaceholder, showPlaceholder, updatePlaceholderForInput } from './visibility';

/**
 * Placeholder Manager - orchestrates animated placeholder text functionality.
 */

function loadPlaceholders(): void {
  const localizedPlaceholders = i18n.t('main.placeholders');

  if (localizedPlaceholders && Array.isArray(localizedPlaceholders)) {
    state.placeholders = localizedPlaceholders;
  } else {
    state.placeholders = [i18n.t('main.placeholder') as string];
  }

  if (state.currentIndex >= state.placeholders.length) {
    state.currentIndex = 0;
  }
}

function initialSetup(): void {
  const { customPlaceholder, input } = state.elements;

  if (!state.hasUrlQuestion && customPlaceholder && input) {
    showPlaceholder();
  }
}

export function initializePlaceholder(): void {
  state.elements.input = elements.question();
  state.elements.submitButton = elements.submitButton();
  state.elements.customPlaceholder = elements.customPlaceholder();

  loadPlaceholders();

  window.addEventListener('languageChanged', () => {
    loadPlaceholders();
    updatePlaceholder();
  });

  const path = window.location.pathname;
  state.hasUrlQuestion = Boolean(path && path !== '/' && path !== '/index.html');

  if (state.hasUrlQuestion) {
    hidePlaceholder();
  }

  setupPlaceholderEvents();
  initialSetup();

  if (!state.hasUrlQuestion) {
    startRotation();
  }

  initMobileSupport();
}

export function resetPlaceholder(): void {
  state.hasUrlQuestion = false;
  state.currentIndex = 0;

  stopRotation();

  const { customPlaceholder, input } = state.elements;

  if (customPlaceholder && input) {
    setText(customPlaceholder, state.placeholders[0]);
    setAttribute(input, 'placeholder', state.placeholders[0]);
    showPlaceholder();
    applyRTLPosition(customPlaceholder);
  }

  setSubmitButtonState(false);
  startRotation();
}

export function cleanupPlaceholder(): void {
  stopRotation();
}

export { updatePlaceholderForInput };

export const PlaceholderManager = {
  initialize: initializePlaceholder,
  updatePlaceholderForInput,
  reset: resetPlaceholder,
  cleanup: cleanupPlaceholder,
};
