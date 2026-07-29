import { BREAKPOINTS, CSS_CLASSES } from '@lmgroktfy/shared';
import { addClass, elements, removeClass, setStyle } from './dom';

/**
 * Responsive layout: toggles mobile touch affordances on the buttons and input
 * as the viewport crosses the mobile breakpoint.
 */

export function isMobile(): boolean {
  return window.innerWidth < BREAKPOINTS.MOBILE;
}

function setMobileLayout(): void {
  for (const getButton of Object.values(elements.buttons)) {
    addClass(getButton(), CSS_CLASSES.TOUCH_TARGET);
  }
  addClass(elements.question(), CSS_CLASSES.MOBILE_INPUT);
  addClass(document.body, CSS_CLASSES.MOBILE_VIEW);
}

function setDesktopLayout(): void {
  for (const getButton of Object.values(elements.buttons)) {
    removeClass(getButton(), CSS_CLASSES.TOUCH_TARGET);
  }
  removeClass(elements.question(), CSS_CLASSES.MOBILE_INPUT);
  removeClass(document.body, CSS_CLASSES.MOBILE_VIEW);
}

export function checkViewport(): void {
  if (isMobile()) {
    setMobileLayout();
  } else {
    setDesktopLayout();
  }
}

export function initViewportHandling(): void {
  checkViewport();
  window.addEventListener('resize', checkViewport);
}

export function enhanceForTouch(element: HTMLElement | null): void {
  if (!element) return;
  setStyle(element, 'touch-action', 'manipulation');
  addClass(element, 'active:bg-opacity-70');
  addClass(element, 'transition-transform');
  addClass(element, 'active:scale-95');
}
