/**
 * Focus state management.
 */

export const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface FocusState {
  currentFocusElement: HTMLElement | null;
  trapContainer: HTMLElement | null;
  previousFocusElement: HTMLElement | null;
}

export const state: FocusState = {
  currentFocusElement: null,
  trapContainer: null,
  previousFocusElement: null,
};

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !('disabled' in el && el.disabled) && el.offsetParent !== null
  );
}
