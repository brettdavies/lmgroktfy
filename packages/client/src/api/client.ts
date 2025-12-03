import {
  API_ENDPOINTS,
  GrokErrorSchema,
  type GrokResponse,
  GrokResponseSchema,
  HEADERS,
  encodeQuestionForUrl,
} from '@lmgroktfy/shared';
import { hideLoading, showError, showLoading, showSuccess } from '../ui';

/**
 * API Client - handles Grok API requests.
 */

export async function submitQuestion(question: string): Promise<GrokResponse | null> {
  if (!question?.trim()) {
    return null;
  }

  showLoading();

  try {
    const response = await fetch(API_ENDPOINTS.GROK, {
      method: 'POST',
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
      body: JSON.stringify({ question }),
    });

    hideLoading();

    if (!response.ok) {
      const errorData = await response.json();
      const errorValidation = GrokErrorSchema.safeParse(errorData);

      console.error(
        '[API] Error:',
        errorValidation.success ? errorValidation.data.error : `HTTP ${response.status}`
      );

      showError(question);
      return null;
    }

    const data = await response.json();
    const validation = GrokResponseSchema.safeParse(data);

    if (!validation.success) {
      console.error('[API] Invalid response format:', validation.error);
      showError(question);
      return null;
    }

    showSuccess(validation.data.answer, question);

    const encodedQuestion = encodeQuestionForUrl(question);
    window.history.replaceState({}, '', `/${encodedQuestion}`);

    return validation.data;
  } catch (error) {
    console.error('[API] Request failed:', error);
    hideLoading();
    showError(question);
    return null;
  }
}

export async function handleQuestionSubmission(question: string): Promise<void> {
  await submitQuestion(question);
}
