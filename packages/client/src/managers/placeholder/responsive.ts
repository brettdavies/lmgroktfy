import { BREAKPOINTS } from '@lmgroktfy/shared';
import { addClass, enhanceForTouch, removeClass } from '../../ui';
import { state } from './state';

/**
 * Mobile/responsive placeholder handling.
 */

export function initMobileSupport(): void {
  const isMobile = window.innerWidth < BREAKPOINTS.MOBILE;
  const { input, submitButton, customPlaceholder } = state.elements;

  if (isMobile) {
    enhanceForTouch(input);
    enhanceForTouch(submitButton);
    if (customPlaceholder) {
      addClass(customPlaceholder, 'mobile-placeholder');
    }
  }

  window.addEventListener('resize', handleResize);
}

function handleResize(): void {
  const { customPlaceholder } = state.elements;
  const isMobile = window.innerWidth < BREAKPOINTS.MOBILE;

  if (customPlaceholder) {
    if (isMobile) {
      addClass(customPlaceholder, 'mobile-placeholder');
    } else {
      removeClass(customPlaceholder, 'mobile-placeholder');
    }
  }
}
