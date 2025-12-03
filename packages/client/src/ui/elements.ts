import { ELEMENT_IDS } from '@lmgroktfy/shared';
import type { ButtonElements, UIElements } from '@lmgroktfy/shared';

/**
 * Type-safe DOM element getters using shared ELEMENT_IDS constants.
 * Always use these getters instead of direct document.getElementById calls.
 */

function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export const buttonElements: ButtonElements = {
  continueLink: () => getElement<HTMLAnchorElement>(ELEMENT_IDS.CONTINUE_LINK),
  useGrok: () => getElement<HTMLAnchorElement>(ELEMENT_IDS.USE_GROK_BUTTON),
  share: () => getElement<HTMLButtonElement>(ELEMENT_IDS.SHARE_BUTTON),
  copyQA: () => getElement<HTMLButtonElement>(ELEMENT_IDS.COPY_QA_BUTTON),
  copyAnswer: () => getElement<HTMLButtonElement>(ELEMENT_IDS.COPY_ANSWER_BUTTON),
  shareOnX: () => getElement<HTMLButtonElement>(ELEMENT_IDS.SHARE_ON_X_BUTTON),
};

export const elements: UIElements = {
  question: () => getElement<HTMLInputElement>(ELEMENT_IDS.QUESTION_INPUT),
  answer: () => getElement<HTMLElement>(ELEMENT_IDS.ANSWER),
  loading: () => getElement<HTMLElement>(ELEMENT_IDS.LOADING),
  response: () => getElement<HTMLElement>(ELEMENT_IDS.RESPONSE),
  questionForm: () => getElement<HTMLFormElement>(ELEMENT_IDS.QUESTION_FORM),
  toast: () => getElement<HTMLElement>(ELEMENT_IDS.TOAST),
  toastMessage: () => getElement<HTMLElement>(ELEMENT_IDS.TOAST_MESSAGE),
  questionDisplay: () => getElement<HTMLElement>(ELEMENT_IDS.QUESTION_DISPLAY),
  customPlaceholder: () => getElement<HTMLElement>(ELEMENT_IDS.CUSTOM_PLACEHOLDER),
  submitButton: () => getElement<HTMLButtonElement>(ELEMENT_IDS.SUBMIT_BUTTON),
  buttons: buttonElements,
};
