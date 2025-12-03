import { addClass, removeClass } from '../../ui';

/**
 * RTL positioning utilities for placeholder.
 */

export function isRTL(): boolean {
  return document.documentElement.getAttribute('dir') === 'rtl';
}

export function applyRTLPosition(placeholder: HTMLElement): void {
  removeClass(placeholder, 'left-6');
  removeClass(placeholder, 'right-6');

  if (isRTL()) {
    addClass(placeholder, 'right-6');
    addClass(placeholder, 'text-right');
  } else {
    addClass(placeholder, 'left-6');
    removeClass(placeholder, 'text-right');
  }
}
