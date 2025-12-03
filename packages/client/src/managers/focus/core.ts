import { addClass, removeClass } from '../../ui';
import { announceToScreenReader } from '../../ui/a11y';
import { state } from './state';

/**
 * Core focus operations.
 */

export function setFocus(
  element: HTMLElement,
  options: FocusOptions & { announceToScreenReader?: boolean } = {}
): void {
  element.focus(options);
  addClass(element, 'focused');
  state.currentFocusElement = element;

  if (options.announceToScreenReader) {
    announceToScreenReader(
      `Focus is now on ${element.tagName.toLowerCase()}${element.id ? ` ${element.id}` : ''}`
    );
  }
}

export function clearFocus(element: HTMLElement): void {
  element.blur();
  removeClass(element, 'focused');

  if (state.currentFocusElement === element) {
    state.currentFocusElement = null;
  }
}

export function trackFocus(event: FocusEvent): void {
  const target = event.target as HTMLElement;
  state.currentFocusElement = target;

  for (const el of document.querySelectorAll('.focused')) {
    if (el !== target) {
      removeClass(el as HTMLElement, 'focused');
    }
  }

  addClass(target, 'focused');
}
