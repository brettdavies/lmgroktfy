import { CSS_CLASSES, ELEMENT_IDS } from '@lmgroktfy/shared';
import type { ButtonElements, UIElements } from '@lmgroktfy/shared';

/**
 * Type-safe DOM getters keyed by the shared `ELEMENT_IDS` registry, plus the
 * low-level class/text/attribute helpers the island builds on. The getters are
 * the single lookup surface: the rest of the island never calls
 * `document.getElementById` directly.
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

export function show(element: HTMLElement | null): void {
  if (element) element.classList.remove(CSS_CLASSES.HIDDEN);
}

export function hide(element: HTMLElement | null): void {
  if (element) element.classList.add(CSS_CLASSES.HIDDEN);
}

export function setOpacity(element: HTMLElement | null, value: number): void {
  if (element) element.style.opacity = value.toString();
}

export function setText(element: HTMLElement | null, text: string): void {
  if (element) element.textContent = text;
}

export function addClass(element: HTMLElement | null, className: string): void {
  if (element) element.classList.add(className);
}

export function removeClass(element: HTMLElement | null, className: string): void {
  if (element) element.classList.remove(className);
}

export function setAttribute(element: HTMLElement | null, name: string, value: string): void {
  if (element) element.setAttribute(name, value);
}

export function setStyle(element: HTMLElement | null, property: string, value: string): void {
  if (element) element.style.setProperty(property, value);
}

export function enableButton(button: HTMLButtonElement | null): void {
  if (button) button.disabled = false;
}

export function disableButton(button: HTMLButtonElement | null): void {
  if (button) button.disabled = true;
}
