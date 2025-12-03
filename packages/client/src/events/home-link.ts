import { resetPlaceholder, setFocus } from '../managers';
import { elements, resetUI, setSubmitButtonState } from '../ui';

/**
 * Sets up the home link click handler to reset the UI.
 */
export function setupHomeLink(): void {
  const homeLink = document.querySelector('.home-link');
  if (!homeLink) return;

  homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetUI();
    resetPlaceholder();

    setTimeout(() => {
      const questionInput = elements.question();
      const hasValue = (questionInput?.value.trim().length ?? 0) > 0;
      setSubmitButtonState(hasValue);

      if (questionInput) {
        setFocus(questionInput);
      }
    }, 100);
  });
}
