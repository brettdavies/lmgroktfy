import { hide, removeClass } from '../../ui';
import { announceToScreenReader } from '../../ui/a11y';
import { setFocus } from './core';
import { FOCUSABLE_SELECTOR, state } from './state';
import { handleTabKeyInTrap, releaseFocusTrap } from './trap';

/**
 * Keyboard navigation handlers.
 */

function handleEscapeKey(): void {
  const openModal = document.querySelector<HTMLElement>(
    '.modal.active, dialog[open], [role="dialog"].active'
  );

  if (openModal) {
    removeClass(openModal, 'active');
    if (openModal.tagName === 'DIALOG') {
      (openModal as HTMLDialogElement).close();
    } else {
      hide(openModal);
    }

    releaseFocusTrap();

    const returnFocusTo = openModal.dataset.returnFocusTo;
    if (returnFocusTo) {
      const element = document.getElementById(returnFocusTo);
      if (element) setFocus(element);
    }

    announceToScreenReader('Dialog closed');
  }
}

function handleListNavigation(event: KeyboardEvent): void {
  const activeElement = document.activeElement as HTMLElement;
  const list = activeElement?.closest('[role="listbox"], [role="menu"], [role="tablist"], ul, ol');
  if (!list) return;

  const items = Array.from(list.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const currentIndex = items.indexOf(activeElement);
  if (currentIndex === -1) return;

  let nextIndex: number;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      nextIndex = (currentIndex + 1) % items.length;
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      nextIndex = (currentIndex - 1 + items.length) % items.length;
      break;
    default:
      return;
  }

  event.preventDefault();
  setFocus(items[nextIndex]);
}

function handleArrowKeys(event: KeyboardEvent): void {
  const activeElement = document.activeElement as HTMLElement;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement?.tagName)) {
    return;
  }

  if (activeElement?.closest('[role="listbox"], [role="menu"], [role="tablist"], ul, ol')) {
    handleListNavigation(event);
  }
}

export function handleKeyboardNavigation(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    handleEscapeKey();
  }

  if (event.key === 'Tab' && state.trapContainer) {
    handleTabKeyInTrap(event);
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    handleArrowKeys(event);
  }

  if (event.key === 'Enter' && document.activeElement) {
    const activeElement = document.activeElement as HTMLElement;
    if (
      activeElement.tagName === 'BUTTON' ||
      (activeElement.tagName === 'A' && activeElement.hasAttribute('href'))
    ) {
      activeElement.click();
    }
  }
}
