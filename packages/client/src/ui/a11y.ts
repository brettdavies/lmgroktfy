import { DELAYS, ELEMENT_IDS } from '@lmgroktfy/shared';
import { setAttribute, setStyle, setText } from './dom';
import { elements } from './elements';
import { showError, showLoading, showSuccess } from './transitions';

/**
 * Accessibility utilities for ARIA attributes and screen reader announcements.
 */

export function setAriaAttribute(element: HTMLElement | null, name: string, value: string): void {
  if (!element) return;
  element.setAttribute(`aria-${name}`, value);
}

export function removeAriaAttribute(element: HTMLElement | null, name: string): void {
  if (!element) return;
  element.removeAttribute(`aria-${name}`);
}

function getOrCreateScreenReaderAnnouncer(): HTMLElement {
  let announcer = document.getElementById(ELEMENT_IDS.SR_ANNOUNCER);

  if (!announcer) {
    announcer = document.createElement('div');
    setAttribute(announcer, 'id', ELEMENT_IDS.SR_ANNOUNCER);
    setAriaAttribute(announcer, 'live', 'polite');
    setAriaAttribute(announcer, 'atomic', 'true');
    setStyle(announcer, 'position', 'absolute');
    setStyle(announcer, 'width', '1px');
    setStyle(announcer, 'height', '1px');
    setStyle(announcer, 'padding', '0');
    setStyle(announcer, 'overflow', 'hidden');
    setStyle(announcer, 'clip', 'rect(0, 0, 0, 0)');
    setStyle(announcer, 'whiteSpace', 'nowrap');
    setStyle(announcer, 'border', '0');
    document.body.appendChild(announcer);
  }

  return announcer;
}

export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcer = getOrCreateScreenReaderAnnouncer();

  setAriaAttribute(announcer, 'live', priority);
  setText(announcer, '');

  setTimeout(() => {
    setText(announcer, message);
  }, DELAYS.SR_ANNOUNCEMENT);
}

export function setAccessibleName(
  element: HTMLElement | null,
  labelOrId: string,
  useElementReference = false
): void {
  if (!element) return;

  if (useElementReference) {
    setAriaAttribute(element, 'labelledby', labelOrId);
    removeAriaAttribute(element, 'label');
  } else {
    setAriaAttribute(element, 'label', labelOrId);
    removeAriaAttribute(element, 'labelledby');
  }
}

export function setAccessibleDescription(
  element: HTMLElement | null,
  descriptionOrId: string,
  useElementReference = false
): void {
  if (!element) return;

  if (useElementReference) {
    setAriaAttribute(element, 'describedby', descriptionOrId);
    removeAriaAttribute(element, 'description');
  } else {
    setAriaAttribute(element, 'description', descriptionOrId);
    removeAriaAttribute(element, 'describedby');
  }
}

export function showAccessibleLoading(loadingMessage = 'Loading...'): void {
  showLoading();

  const loading = elements.loading();
  if (loading) {
    setAriaAttribute(loading, 'busy', 'true');
    setAriaAttribute(loading, 'live', 'polite');
    setText(loading, loadingMessage);
  }

  announceToScreenReader(loadingMessage);
}

export function showAccessibleError(
  question: string,
  errorMessage = 'Oops, something went wrong!'
): void {
  showError(question);

  const answer = elements.answer();
  if (answer) {
    setAriaAttribute(answer, 'live', 'assertive');
    setText(answer, errorMessage);
  }

  announceToScreenReader(errorMessage, 'assertive');
}

export function showAccessibleSuccess(answer: string, question: string): void {
  showSuccess(answer, question);

  const answerElement = elements.answer();
  if (answerElement) {
    setAriaAttribute(answerElement, 'live', 'polite');
  }

  announceToScreenReader('Answer received');
}
