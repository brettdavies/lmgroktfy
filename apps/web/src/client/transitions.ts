import { TOAST_DURATION, getGrokUrl, getXGrokUrl } from '@lmgroktfy/shared';
import { elements, hide, setAttribute, setText, show } from './dom';
import {
  hideAllButtons,
  hideQuestionForm,
  hideResponse,
  setSubmitButtonState,
  showAllButtons,
  showQuestionForm,
  showResponse,
} from './visibility';

/**
 * UI state transitions. The answer is written into the `#response` region, which
 * the server renders with `aria-live="polite"`, so assistive tech announces it
 * without any extra wiring here.
 */

export function showLoading(): void {
  show(elements.loading());
  hideResponse();
}

export function hideLoading(): void {
  hide(elements.loading());
}

export function showError(question?: string): void {
  hideQuestionForm();

  const questionDisplay = elements.questionDisplay();
  if (questionDisplay && question) {
    setText(questionDisplay, question);
  }

  setText(elements.answer(), 'Oops, something went wrong!');
  hideAllButtons();
  showResponse();
}

export function showSuccess(answer: string, question: string): void {
  hideQuestionForm();
  setText(elements.questionDisplay(), question);
  setText(elements.answer(), answer);
  updateGrokButtons(question);
  showAllButtons();
  showResponse();
}

export function updateGrokButtons(question: string): void {
  const continueLink = elements.buttons.continueLink();
  if (continueLink) {
    setAttribute(continueLink, 'href', getGrokUrl(question));
  }

  const useGrokButton = elements.buttons.useGrok();
  if (useGrokButton) {
    setAttribute(useGrokButton, 'href', getXGrokUrl(question));
  }
}

export function showToast(message: string): void {
  setText(elements.toastMessage(), message);

  const toast = elements.toast();
  if (toast) {
    show(toast);
    setTimeout(() => hide(toast), TOAST_DURATION);
  }
}

export function resetUI(homePath = '/'): void {
  const questionInput = elements.question();
  if (questionInput) questionInput.value = '';

  setText(elements.answer(), '');
  hideResponse();
  showQuestionForm();
  hideAllButtons();
  setSubmitButtonState(false);

  window.history.pushState({}, '', homePath);
}
