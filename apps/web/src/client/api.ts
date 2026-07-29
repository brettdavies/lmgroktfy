import {
  API_ENDPOINTS,
  GrokErrorSchema,
  GrokResponseSchema,
  HEADERS,
  encodeQuestionForUrl,
} from '@lmgroktfy/shared';
import { elements } from './dom';
import { hideLoading, showError, showLoading, showSuccess } from './transitions';
import { awaitTurnstileToken, getTurnstileToken } from './turnstile';

/**
 * Submits a question to the Grok proxy and renders the result.
 *
 * The POST is gated on a Turnstile token: if one is not present yet (the managed
 * widget resolves asynchronously), the island shows a visible pending state and
 * AWAITS the token rather than firing an unverified request. This is what keeps
 * a `/your+question` deep link from 403-ing on load.
 */
export async function submitQuestion(question: string): Promise<void> {
  if (!question?.trim()) return;

  const token = await resolveToken(question);
  if (token === null) return;

  showLoading();

  try {
    const response = await fetch(API_ENDPOINTS.GROK, {
      method: 'POST',
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
      body: JSON.stringify({ question, turnstileToken: token }),
    });

    hideLoading();

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const parsed = GrokErrorSchema.safeParse(errorData);
      console.error('[api] error:', parsed.success ? parsed.data.error : `HTTP ${response.status}`);
      showError(question);
      return;
    }

    const data = await response.json();
    const validation = GrokResponseSchema.safeParse(data);
    if (!validation.success) {
      console.error('[api] invalid response format');
      showError(question);
      return;
    }

    showSuccess(validation.data.answer, question);
    window.history.replaceState({}, '', `/${encodeQuestionForUrl(question)}`);
  } catch (error) {
    console.error('[api] request failed:', error);
    hideLoading();
    showError(question);
  }
}

/**
 * Returns a Turnstile token, awaiting the managed widget when one is not yet
 * available while showing a visible pending state. Returns `null` (and renders
 * an error) when the token never arrives, so the caller never POSTs unverified.
 */
async function resolveToken(question: string): Promise<string | null> {
  const immediate = getTurnstileToken();
  if (immediate) return immediate;

  const form = elements.questionForm();
  form?.setAttribute('data-awaiting-token', 'true');
  showLoading();

  const token = await awaitTurnstileToken();
  form?.removeAttribute('data-awaiting-token');

  if (!token) {
    hideLoading();
    showError(question);
    return null;
  }
  return token;
}
