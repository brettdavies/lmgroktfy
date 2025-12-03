import { setSubmitButtonState } from '../../ui';
import { state } from './state';
import { updatePlaceholderForInput } from './visibility';

/**
 * Placeholder event listeners.
 */

export function setupPlaceholderEvents(): void {
  const { input } = state.elements;
  if (!input) return;

  input.addEventListener('input', handleInput);
  input.addEventListener('focus', handleFocus);
  input.addEventListener('blur', handleBlur);
}

function handleInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  const value = target.value.trim();
  updatePlaceholderForInput(value);

  const isHandledByScript = target.hasAttribute('data-script-input-handled');
  if (!isHandledByScript) {
    setSubmitButtonState(value.length > 0);
  } else {
    target.removeAttribute('data-script-input-handled');
  }
}

function handleFocus(): void {
  const { input } = state.elements;
  if (input) {
    updatePlaceholderForInput(input.value);
  }
}

function handleBlur(): void {
  const { input } = state.elements;
  if (input) {
    updatePlaceholderForInput(input.value);
  }
}
