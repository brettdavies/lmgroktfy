import type { Page } from '@playwright/test';

export const MOCK_ANSWER = 'Grok says the answer is 42.';
export const TEST_TOKEN = 'test-turnstile-token';

interface GrokBody {
  question: string;
  turnstileToken?: string;
}

/**
 * Mocks `/api/grok` to fail closed exactly like the future Turnstile-gated
 * endpoint: 403 when the POST carries no token, the answer when it does. The
 * returned array collects each posted body for assertions.
 */
export async function mockGrok(page: Page, answer: string = MOCK_ANSWER): Promise<GrokBody[]> {
  const posts: GrokBody[] = [];
  await page.route('**/api/grok', async (route) => {
    const body = route.request().postDataJSON() as GrokBody;
    posts.push(body);
    if (!body?.turnstileToken) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ answer, shareId: 'share-123' }),
    });
  });
  return posts;
}

/** Simulates the managed Turnstile widget writing its token into the hidden input. */
export async function injectTurnstileToken(page: Page, token: string = TEST_TOKEN): Promise<void> {
  await page.evaluate((value) => {
    let input = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'cf-turnstile-response';
      document.body.appendChild(input);
    }
    input.value = value;
  }, token);
}
