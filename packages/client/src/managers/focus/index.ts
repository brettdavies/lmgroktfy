import { elements } from '../../ui';
import { announceToScreenReader } from '../../ui/a11y';
import { clearFocus, setFocus, trackFocus } from './core';
import { handleKeyboardNavigation } from './keyboard-navigation';
import { setupModalFocusTraps } from './modal-setup';
import { getFocusableElements } from './state';
import { releaseFocusTrap, trapFocus } from './trap';

/**
 * Focus Manager - orchestrates focus behavior and keyboard navigation.
 */

function setInitialFocus(): void {
  const questionInput = elements.question();
  if (questionInput) {
    setTimeout(() => setFocus(questionInput), 100);
  }
}

export function focusResponseArea(): void {
  const responseElement = elements.response();
  if (!responseElement) return;

  const focusableElements = getFocusableElements(responseElement);

  if (focusableElements.length > 0) {
    setFocus(focusableElements[0], { announceToScreenReader: true });
  } else {
    responseElement.setAttribute('tabindex', '-1');
    setFocus(responseElement, { announceToScreenReader: true });

    const question = elements.questionDisplay()?.textContent ?? '';
    const answer = elements.answer()?.textContent ?? '';
    announceToScreenReader(`Question: ${question}. Answer: ${answer}`);
  }
}

export function initializeFocus(): void {
  document.addEventListener('keydown', handleKeyboardNavigation);
  setInitialFocus();
  document.addEventListener('focusin', trackFocus);
  setupModalFocusTraps();
}

export { clearFocus, releaseFocusTrap, setFocus, trapFocus };

export const FocusManager = {
  initialize: initializeFocus,
  setFocus,
  clearFocus,
  trapFocus,
  releaseFocusTrap,
  focusResponseArea,
};
