import { elements, setSubmitButtonState } from '../ui';

/**
 * Sets up input tracking to update submit button state.
 */
export function setupInputTracking(): void {
  const questionInput = elements.question();
  if (!questionInput) return;

  questionInput.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    const hasValue = target.value.trim().length > 0;
    target.setAttribute('data-script-input-handled', 'true');

    setTimeout(() => {
      setSubmitButtonState(hasValue);
    }, 20);
  });
}
