import { CSS_CLASSES, DELAYS } from '@lmgroktfy/shared';
import { addClass, elements, hide, removeClass, show } from './dom';

/**
 * Component-level visibility: the action buttons, the response region, the form,
 * and the submit button's enabled state.
 */

export function hideAllButtons(): void {
  for (const getButton of Object.values(elements.buttons)) {
    hide(getButton());
  }
}

export function showAllButtons(): void {
  for (const getButton of Object.values(elements.buttons)) {
    show(getButton());
  }
}

export function setSubmitButtonState(isEnabled: boolean): void {
  const button = elements.submitButton();
  if (!button) return;

  setTimeout(() => {
    button.disabled = !isEnabled;
    if (isEnabled) {
      addClass(button, CSS_CLASSES.DEBUG_ENABLED);
      removeClass(button, CSS_CLASSES.DEBUG_DISABLED);
    } else {
      addClass(button, CSS_CLASSES.DEBUG_DISABLED);
      removeClass(button, CSS_CLASSES.DEBUG_ENABLED);
    }
  }, DELAYS.BUTTON_STATE);
}

export function showQuestionForm(): void {
  show(elements.questionForm());
}

export function hideQuestionForm(): void {
  hide(elements.questionForm());
}

export function showResponse(): void {
  show(elements.response());
}

export function hideResponse(): void {
  hide(elements.response());
}
