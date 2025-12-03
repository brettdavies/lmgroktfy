import { handleQuestionSubmission } from '../api/client';
import { disableButton, elements, enableButton, setSubmitButtonState } from '../ui';

/**
 * Sets up the question form submission handler.
 */
export function setupFormSubmission(): void {
  const form = elements.questionForm();
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    if (submitButton) {
      disableButton(submitButton);
    }

    const questionInput = elements.question();
    const question = questionInput?.value ?? '';

    handleQuestionSubmission(question).finally(() => {
      if (submitButton) {
        enableButton(submitButton);
      }

      setTimeout(() => {
        const hasValue = (questionInput?.value.trim().length ?? 0) > 0;
        setSubmitButtonState(hasValue);
      }, 100);
    });
  });
}
