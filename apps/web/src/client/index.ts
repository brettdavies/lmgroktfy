import {
  processUrlParameters,
  setupCopyButtons,
  setupFormSubmission,
  setupHelpDialog,
  setupHomeLink,
  setupInputTracking,
  setupLanguageSwitcher,
  setupOrientationHandling,
} from './events';
import { initializeFocus } from './focus';
import { setupKeyboardShortcuts } from './keyboard';
import { initializePlaceholder } from './placeholder';
import { applyLangRedirect } from './question-url';
import { initializeTheme } from './theme';
import { initViewportHandling } from './viewport';

/**
 * Client island entry. Bundled to an external file and served under
 * `script-src 'self'`; it carries no inline script or inline handlers so the
 * static CSP (no nonce) holds.
 */
function bootstrap(): void {
  // Prerendered roots (`/`, `/es/`) bypass the Worker, so the server `?lang=`
  // redirect can't fire there — handle it client-side before anything else.
  if (applyLangRedirect()) return;

  initViewportHandling();
  initializeTheme();
  initializePlaceholder();
  initializeFocus();

  setupHelpDialog();
  setupLanguageSwitcher();
  setupHomeLink();
  setupFormSubmission();
  setupInputTracking();
  setupCopyButtons();
  setupKeyboardShortcuts();
  setupOrientationHandling();

  processUrlParameters();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
