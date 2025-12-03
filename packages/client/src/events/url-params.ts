import { handleQuestionSubmission } from '../api/client';
import { elements, setSubmitButtonState } from '../ui';

/**
 * Processes URL path parameters to auto-submit questions.
 */
export function processUrlParameters(): void {
  const path = window.location.pathname;

  if (!path || path === '/' || path === '/index.html') {
    return;
  }

  try {
    let question = path.replace(/^\//, '').replace(/\?.*$/, '').trim();
    question = decodeURIComponent(question);

    // Handle double-encoded URLs
    if (question.includes('%20')) {
      question = decodeURIComponent(question);
    }

    if (question) {
      const questionInput = elements.question();
      if (questionInput) {
        questionInput.value = question;
      }

      setSubmitButtonState(true);
      handleQuestionSubmission(question);
    }
  } catch (error) {
    console.error('[App] Error processing URL parameters:', error);
  }
}
