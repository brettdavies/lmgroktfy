import { expect, test } from '@playwright/test';
import { MOCK_ANSWER, TEST_TOKEN, injectTurnstileToken, mockGrok } from './helpers';

test.describe('deep-link auto-submit', () => {
  test('waits for the Turnstile token before POSTing, then renders (no 403)', async ({ page }) => {
    const posts = await mockGrok(page);

    await page.goto('/what+is+grok');

    // The decoded question populates the input.
    await expect(page.locator('#question-input')).toHaveValue('what is grok');

    // Pending: the island is awaiting the token and has NOT POSTed yet.
    await expect(page.locator('#question-form')).toHaveAttribute('data-awaiting-token', 'true');
    await expect(page.locator('#loading')).toBeVisible();
    expect(posts).toHaveLength(0);

    // The managed widget resolves a token.
    await injectTurnstileToken(page);

    // Now it POSTs with the token and renders the answer into the aria-live region.
    await expect(page.locator('#answer')).toHaveText(MOCK_ANSWER);
    await expect(page.locator('#response')).toBeVisible();
    expect(posts).toHaveLength(1);
    expect(posts[0].turnstileToken).toBe(TEST_TOKEN);
  });

  test('a locale-prefixed deep link resolves the question shell', async ({ page }) => {
    const posts = await mockGrok(page);

    await page.goto('/es/what+is+grok');
    await expect(page.locator('#question-input')).toHaveValue('what is grok');

    await injectTurnstileToken(page);
    await expect(page.locator('#answer')).toHaveText(MOCK_ANSWER);
    expect(posts[0].turnstileToken).toBe(TEST_TOKEN);
  });
});
