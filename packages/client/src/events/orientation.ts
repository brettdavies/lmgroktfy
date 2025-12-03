import { checkViewport } from '../ui';

/**
 * Sets up orientation change handler for mobile devices.
 */
export function setupOrientationHandling(): void {
  window.addEventListener('orientationchange', () => {
    setTimeout(checkViewport, 100);
  });
}
