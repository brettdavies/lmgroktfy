import { CSS_CLASSES, DELAYS } from '@lmgroktfy/shared';
import { addClass, hide, removeClass, setOpacity, show } from './dom';
import { elements } from './elements';

/**
 * Component-specific visibility management.
 * Controls visibility of buttons, placeholders, and other UI components.
 */

export function hideAllButtons(): void {
  for (const btnGetter of Object.values(elements.buttons)) {
    const element = btnGetter();
    if (element) element.classList.add(CSS_CLASSES.HIDDEN);
  }
}

export function showAllButtons(): void {
  for (const btnGetter of Object.values(elements.buttons)) {
    const element = btnGetter();
    if (element) element.classList.remove(CSS_CLASSES.HIDDEN);
  }
}

export function setSubmitButtonState(isEnabled: boolean): void {
  const button = elements.submitButton();

  if (button) {
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
}

export function updatePlaceholderVisibility(
  value: string,
  isFocused: boolean,
  hasUrlQuestion: boolean
): void {
  const customPlaceholder = elements.customPlaceholder();
  const questionInput = elements.question();

  if (!customPlaceholder || !questionInput) return;

  if (hasUrlQuestion) {
    setOpacity(customPlaceholder, 0);
    removeClass(questionInput, CSS_CLASSES.PLACEHOLDER_HIDDEN);
    return;
  }

  const isEmpty = !value.trim();

  setOpacity(customPlaceholder, isEmpty && !isFocused ? 1 : 0);

  if (isEmpty && !isFocused) {
    addClass(questionInput, CSS_CLASSES.PLACEHOLDER_HIDDEN);
  } else {
    removeClass(questionInput, CSS_CLASSES.PLACEHOLDER_HIDDEN);
  }

  setSubmitButtonState(!isEmpty);
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
