import { addClass, elements, hide, removeClass, setAttribute } from './dom';
import { announceToScreenReader } from './a11y';

/**
 * Focus management: initial focus, a `.focused` marker synced to the active
 * element, and a modal focus trap that cycles Tab within an open dialog and
 * restores focus to the opener on close. Escape closing is handled here so it
 * works for both native `<dialog>` and any class-based modal.
 */

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface FocusState {
  trapContainer: HTMLElement | null;
  previousFocusElement: HTMLElement | null;
}

const state: FocusState = { trapContainer: null, previousFocusElement: null };

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !('disabled' in el && (el as HTMLButtonElement).disabled) && el.offsetParent !== null
  );
}

export function setFocus(element: HTMLElement): void {
  element.focus();
  addClass(element, 'focused');
}

function trackFocus(event: FocusEvent): void {
  const target = event.target as HTMLElement;
  for (const el of document.querySelectorAll('.focused')) {
    if (el !== target) removeClass(el as HTMLElement, 'focused');
  }
  addClass(target, 'focused');
}

/**
 * Traps focus inside `container`. `returnTo` is captured explicitly because a
 * native `dialog.showModal()` moves focus into the dialog before this runs, so
 * reading `document.activeElement` here would lose the real opener.
 */
export function trapFocus(container: HTMLElement, returnTo?: HTMLElement | null): void {
  state.trapContainer = container;
  state.previousFocusElement = returnTo ?? (document.activeElement as HTMLElement | null);

  const focusable = getFocusableElements(container);
  if (focusable.length > 0) setFocus(focusable[0]);

  if (state.previousFocusElement?.id) {
    setAttribute(container, 'data-return-focus-to', state.previousFocusElement.id);
  }

  announceToScreenReader('Dialog opened. Press Escape to close.');
}

function releaseFocusTrap(): void {
  if (state.previousFocusElement) setFocus(state.previousFocusElement);
  state.trapContainer = null;
}

/**
 * Stops trapping Tab without moving focus. Called when a dialog closes by any
 * means (the native close button restores focus on its own), so the trap does
 * not stay armed after the dialog is gone.
 */
export function clearFocusTrap(): void {
  state.trapContainer = null;
}

function handleTabKeyInTrap(event: KeyboardEvent): void {
  if (!state.trapContainer) return;

  const focusable = getFocusableElements(state.trapContainer);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    setFocus(last);
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    setFocus(first);
  }
}

function handleEscapeKey(): void {
  const openModal = document.querySelector<HTMLElement>(
    '.modal.active, dialog[open], [role="dialog"].active'
  );
  if (!openModal) return;

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

function handleKeyboardNavigation(event: KeyboardEvent): void {
  if (event.key === 'Escape') handleEscapeKey();
  if (event.key === 'Tab' && state.trapContainer) handleTabKeyInTrap(event);
}

function setInitialFocus(): void {
  const questionInput = elements.question();
  if (questionInput) setTimeout(() => setFocus(questionInput), 100);
}

export function initializeFocus(): void {
  document.addEventListener('keydown', handleKeyboardNavigation);
  document.addEventListener('focusin', trackFocus);
  setInitialFocus();
}
