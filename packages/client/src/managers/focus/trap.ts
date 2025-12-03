import { setAttribute } from '../../ui';
import { announceToScreenReader } from '../../ui/a11y';
import { setFocus } from './core';
import { getFocusableElements, state } from './state';

/**
 * Focus trap for modals and dialogs.
 */

export function trapFocus(container: HTMLElement): void {
  state.trapContainer = container;
  state.previousFocusElement = document.activeElement as HTMLElement;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    setFocus(focusableElements[0]);
  }

  if (state.previousFocusElement?.id) {
    setAttribute(container, 'data-return-focus-to', state.previousFocusElement.id);
  }

  announceToScreenReader('Dialog opened. Press Escape to close.');
}

export function releaseFocusTrap(): void {
  if (state.previousFocusElement) {
    setFocus(state.previousFocusElement);
  }
  state.trapContainer = null;
}

export function handleTabKeyInTrap(event: KeyboardEvent): void {
  if (!state.trapContainer) return;

  const focusableElements = getFocusableElements(state.trapContainer);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    setFocus(lastElement);
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    setFocus(firstElement);
  }
}
