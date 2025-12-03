/**
 * Responsive breakpoints in pixels
 */
export const BREAKPOINTS = {
  MOBILE: 768,
} as const;

/**
 * CSS class names used throughout the application
 */
export const CSS_CLASSES = {
  HIDDEN: 'hidden',
  TOUCH_TARGET: 'touch-target',
  MOBILE_VIEW: 'mobile-view',
  MOBILE_INPUT: 'mobile-input',
  PLACEHOLDER_HIDDEN: 'placeholder-hidden',
  DEBUG_ENABLED: 'debug-enabled',
  DEBUG_DISABLED: 'debug-disabled',
} as const;

/**
 * DOM element IDs used throughout the application
 */
export const ELEMENT_IDS = {
  QUESTION_INPUT: 'question-input',
  ANSWER: 'answer',
  LOADING: 'loading',
  RESPONSE: 'response',
  QUESTION_FORM: 'question-form',
  TOAST: 'toast',
  TOAST_MESSAGE: 'toast-message',
  QUESTION_DISPLAY: 'question-display',
  CUSTOM_PLACEHOLDER: 'custom-placeholder',
  SUBMIT_BUTTON: 'submit-button',
  CONTINUE_LINK: 'continue-link',
  USE_GROK_BUTTON: 'use-grok-button',
  SHARE_BUTTON: 'share-button',
  COPY_QA_BUTTON: 'copy-question-answer-button',
  COPY_ANSWER_BUTTON: 'copy-answer-button',
  SHARE_ON_X_BUTTON: 'share-on-x-button',
  SR_ANNOUNCER: 'sr-announcer',
} as const;

/**
 * Toast notification duration in milliseconds
 */
export const TOAST_DURATION = 3000;

/**
 * Animation/transition delays in milliseconds
 */
export const DELAYS = {
  BUTTON_STATE: 10,
  FOCUS_AFTER_RESET: 50,
  SR_ANNOUNCEMENT: 50,
} as const;

/**
 * External URLs
 */
export const EXTERNAL_URLS = {
  GROK_BASE: 'https://grok.com/',
  GROK_X_BASE: 'https://x.com/i/grok',
  UTM_SOURCE: 'lmgroktfy',
} as const;
