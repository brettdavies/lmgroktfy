import { BREAKPOINTS, CSS_CLASSES } from '@lmgroktfy/shared';
import { addClass, removeClass, setStyle } from './dom';
import { elements } from './elements';

/**
 * Responsive layout management for mobile and desktop views.
 */

export function isMobile(): boolean {
  return window.innerWidth < BREAKPOINTS.MOBILE;
}

export function setMobileLayout(): void {
  for (const btnGetter of Object.values(elements.buttons)) {
    const btn = btnGetter();
    if (btn) addClass(btn, CSS_CLASSES.TOUCH_TARGET);
  }

  const questionInput = elements.question();
  if (questionInput) {
    addClass(questionInput, CSS_CLASSES.MOBILE_INPUT);
  }

  addClass(document.body, CSS_CLASSES.MOBILE_VIEW);
}

export function setDesktopLayout(): void {
  for (const btnGetter of Object.values(elements.buttons)) {
    const btn = btnGetter();
    if (btn) removeClass(btn, CSS_CLASSES.TOUCH_TARGET);
  }

  const questionInput = elements.question();
  if (questionInput) {
    removeClass(questionInput, CSS_CLASSES.MOBILE_INPUT);
  }

  removeClass(document.body, CSS_CLASSES.MOBILE_VIEW);
}

export function adjustForViewport(isMobileView: boolean): void {
  if (isMobileView) {
    setMobileLayout();
  } else {
    setDesktopLayout();
  }
}

export function checkViewport(): void {
  adjustForViewport(isMobile());
}

export function initViewportHandling(): void {
  checkViewport();
  window.addEventListener('resize', checkViewport);
}

export function enhanceForTouch(element: HTMLElement | null): void {
  if (!element) return;

  setStyle(element, 'touchAction', 'manipulation');
  addClass(element, 'active:bg-opacity-70');
  addClass(element, 'transition-transform');
  addClass(element, 'active:scale-95');
}
