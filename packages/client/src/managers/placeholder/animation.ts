import { addClass, removeClass, setAttribute, setText } from '../../ui';
import { state } from './state';

/**
 * Placeholder rotation animation.
 */

export function updatePlaceholder(): void {
  const { input, customPlaceholder } = state.elements;

  if (state.hasUrlQuestion || document.activeElement === input || input?.value) {
    return;
  }

  state.currentIndex = (state.currentIndex + 1) % state.placeholders.length;

  if (customPlaceholder) {
    removeClass(customPlaceholder, 'animate');
    void customPlaceholder.offsetWidth; // Trigger reflow
    addClass(customPlaceholder, 'animate');
    setText(customPlaceholder, state.placeholders[state.currentIndex]);
  }

  if (input) {
    setAttribute(input, 'placeholder', state.placeholders[state.currentIndex]);
  }
}

export function startRotation(): void {
  state.rotationInterval = setInterval(updatePlaceholder, 3000);
}

export function stopRotation(): void {
  if (state.rotationInterval) {
    clearInterval(state.rotationInterval);
    state.rotationInterval = null;
  }
}
