/**
 * UI module barrel export.
 * Re-exports all UI utilities for convenient importing.
 */

// Elements
export { elements, buttonElements } from './elements';

// DOM manipulation
export {
  show,
  hide,
  setOpacity,
  setText,
  setHtml,
  addClass,
  removeClass,
  toggleClass,
  setAttribute,
  removeAttribute,
  setStyle,
  removeStyle,
  enableButton,
  disableButton,
} from './dom';

// Visibility
export {
  hideAllButtons,
  showAllButtons,
  setSubmitButtonState,
  updatePlaceholderVisibility,
  showQuestionForm,
  hideQuestionForm,
  showResponse,
  hideResponse,
} from './visibility';

// State transitions
export {
  showLoading,
  hideLoading,
  showError,
  showSuccess,
  updateGrokButtons,
  showToast,
  resetUI,
} from './transitions';

// Accessibility
export {
  setAriaAttribute,
  removeAriaAttribute,
  announceToScreenReader,
  setAccessibleName,
  setAccessibleDescription,
  showAccessibleLoading,
  showAccessibleError,
  showAccessibleSuccess,
} from './a11y';

// Viewport
export {
  isMobile,
  setMobileLayout,
  setDesktopLayout,
  adjustForViewport,
  checkViewport,
  initViewportHandling,
  enhanceForTouch,
} from './viewport';
