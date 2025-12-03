/**
 * Client entry point.
 * Initializes the application when the DOM is ready.
 */

import { initializeApp } from './app';

document.addEventListener('DOMContentLoaded', initializeApp);

// Re-export for external usage
export * from './ui';
export * from './managers';
export * from './i18n';
export * from './api/client';
export { initializeApp } from './app';
