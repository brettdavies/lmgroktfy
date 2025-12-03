import { TOAST_DURATION, getGrokUrl, getXGrokUrl } from '@lmgroktfy/shared';
import { hide, setAttribute, setText, show } from './dom';
import { elements } from './elements';
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
 * UI state transitions for loading, success, error, and reset states.
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

  const answerElement = elements.answer();
  if (answerElement) {
    setText(answerElement, 'Oops, something went wrong!');
  }

  hideAllButtons();
  showResponse();
}

export function showSuccess(answer: string, question: string): void {
  hideQuestionForm();

  const questionDisplay = elements.questionDisplay();
  if (questionDisplay) {
    setText(questionDisplay, question);
  }

  const answerElement = elements.answer();
  if (answerElement) {
    setText(answerElement, answer);
  }

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
  const toast = elements.toast();
  const toastMessage = elements.toastMessage();

  if (toastMessage) {
    setText(toastMessage, message);
  }

  if (toast) {
    show(toast);
    setTimeout(() => hide(toast), TOAST_DURATION);
  }
}

export function resetUI(): void {
  const questionInput = elements.question();
  if (questionInput) questionInput.value = '';

  const answerElement = elements.answer();
  if (answerElement) setText(answerElement, '');

  hideResponse();
  showQuestionForm();
  hideAllButtons();

  setSubmitButtonState(false);

  window.history.pushState({}, '', '/');
}
