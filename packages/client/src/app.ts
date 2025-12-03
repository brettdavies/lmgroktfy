import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@lmgroktfy/shared';
import {
  processUrlParameters,
  setupCopyButtons,
  setupFormSubmission,
  setupHomeLink,
  setupInputTracking,
  setupKeyboardShortcuts,
  setupOrientationHandling,
} from './events';
import { i18n } from './i18n';
import { initializeFocus, initializePlaceholder, initializeTheme } from './managers';
import { initViewportHandling } from './ui';

/**
 * Main application initialization.
 */

function setupEventListeners(): void {
  setupHomeLink();
  setupFormSubmission();
  setupInputTracking();
  setupCopyButtons();
  setupKeyboardShortcuts();
  setupOrientationHandling();
}

export async function initializeApp(): Promise<void> {
  try {
    // Initialize i18n
    await i18n.init({
      supportedLanguages: SUPPORTED_LOCALES,
      defaultLanguage: DEFAULT_LOCALE,
      languageSwitcherSelector: '#language-switcher',
    });

    // Initialize UI managers
    initViewportHandling();
    initializePlaceholder();
    initializeTheme();
    initializeFocus();

    // Set up event listeners
    setupEventListeners();

    // Process URL parameters after a delay
    setTimeout(() => {
      i18n.translateDocument();
      processUrlParameters();
    }, 500);
  } catch (error) {
    console.error('[App] Error during initialization:', error);
  }
}
