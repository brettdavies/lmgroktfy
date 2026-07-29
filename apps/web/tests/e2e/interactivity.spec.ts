import { expect, test } from '@playwright/test';
import { MOCK_ANSWER, injectTurnstileToken, mockGrok } from './helpers';

const HELP_TRIGGER = 'button[aria-label="How to use"]';

test.describe('keyboard and focus', () => {
  test('/ focuses the question input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#question-input')).toBeFocused();

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(page.locator('#question-input')).not.toBeFocused();

    await page.keyboard.press('/');
    await expect(page.locator('#question-input')).toBeFocused();
  });

  test('? opens help; Esc closes it and restores focus to the opener', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#question-input')).toBeFocused();

    await page.locator(HELP_TRIGGER).focus();
    await page.keyboard.press('?');
    await expect(page.locator('#help_modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#help_modal')).toBeHidden();
    await expect(page.locator(HELP_TRIGGER)).toBeFocused();
  });

  test('focus trap keeps Tab within the open help dialog', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#question-input')).toBeFocused();

    await page.locator(HELP_TRIGGER).focus();
    await page.keyboard.press('?');
    await expect(page.locator('#help_modal')).toBeVisible();

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
    }
    const trapped = await page.evaluate(() =>
      document.getElementById('help_modal')?.contains(document.activeElement) ?? false
    );
    expect(trapped).toBe(true);
  });
});

test.describe('submit and share', () => {
  test('submitting a typed question renders the answer into the aria-live region', async ({
    page,
  }) => {
    await mockGrok(page);
    await page.goto('/');
    await injectTurnstileToken(page);

    await page.fill('#question-input', 'what is grok');
    await page.locator('#submit-button').click();

    const response = page.locator('#response');
    await expect(response).toBeVisible();
    await expect(response).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#answer')).toHaveText(MOCK_ANSWER);
  });

  test('copy share link writes the current URL to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await mockGrok(page);
    await page.goto('/');
    await injectTurnstileToken(page);

    await page.fill('#question-input', 'what is grok');
    await page.locator('#submit-button').click();
    await expect(page.locator('#answer')).toHaveText(MOCK_ANSWER);
    await expect(page).toHaveURL(/\/what%20is%20grok$/);

    await page.locator('#share-button').click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('/what%20is%20grok');
    await expect(page.locator('#toast')).toBeVisible();
  });
});

test.describe('theme and placeholder', () => {
  test('the theme toggle drives class-based dark: utilities', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const html = page.locator('html');
    const body = page.locator('body');

    await expect(html).not.toHaveClass(/\bdark\b/);
    expect(await body.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(255, 255, 255)'
    );

    await page.locator('#theme-toggle').click();

    await expect(html).toHaveClass(/\bdark\b/);
    expect(await body.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(35, 35, 37)');
  });

  test('the rotating placeholder overlay shows a suggestion when the input is idle', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#question-input')).toBeFocused();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    const overlay = page.locator('#custom-placeholder');
    await expect(overlay).toBeVisible();
    await expect(overlay).not.toHaveText('');
  });
});

test.describe('client-side language redirect', () => {
  test('?lang=es on the root redirects to /es/', async ({ page }) => {
    await page.goto('/?lang=es');
    await page.waitForURL(/\/es\/$/);
    await expect(page).toHaveURL(/\/es\/$/);
  });
});

test.describe('turnstile widget a11y', () => {
  // Block the real widget script so the container is asserted deterministically
  // regardless of network; the client seam injects the token separately.
  async function stubTurnstileScript(page: import('@playwright/test').Page): Promise<void> {
    await page.route('**/challenges.cloudflare.com/**', (route) => route.abort());
  }

  test('the widget mounts inside the form with the built site key and does not steal initial focus', async ({
    page,
  }) => {
    await stubTurnstileScript(page);
    await page.goto('/');

    const widget = page.locator('#turnstile-widget.cf-turnstile');
    await expect(widget).toHaveCount(1);
    await expect(widget).toHaveAttribute('data-sitekey', /.+/);

    // The managed widget renders without moving focus off the question input.
    await expect(page.locator('#question-input')).toBeFocused();

    const inForm = await widget.evaluate((el) => el.closest('#question-form') !== null);
    expect(inForm).toBe(true);

    // Present in the script surface for the browser to load.
    const scriptCount = await page
      .locator('script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]')
      .count();
    expect(scriptCount).toBe(1);
  });

  test('the widget is keyboard-eligible and sits outside the aria-live regions', async ({
    page,
  }) => {
    await stubTurnstileScript(page);
    await page.goto('/');

    const widget = page.locator('#turnstile-widget');
    // No override removes it from the tab order or hides it from assistive tech.
    await expect(widget).not.toHaveAttribute('tabindex', '-1');
    await expect(widget).not.toHaveAttribute('aria-hidden', 'true');

    const nestedInLiveRegion = await widget.evaluate(
      (el) => el.closest('#response') !== null || el.closest('#loading') !== null
    );
    expect(nestedInLiveRegion).toBe(false);

    const hasLiveAncestor = await widget.evaluate((el) => el.closest('[aria-live]') !== null);
    expect(hasLiveAncestor).toBe(false);
  });

  test('the help-dialog focus trap holds with the widget present (widget is not reachable)', async ({
    page,
  }) => {
    await stubTurnstileScript(page);
    await page.goto('/');
    await expect(page.locator('#question-input')).toBeFocused();

    await page.locator('button[aria-label="How to use"]').focus();
    await page.keyboard.press('?');
    await expect(page.locator('#help_modal')).toBeVisible();

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
    }

    const trappedInDialog = await page.evaluate(
      () => document.getElementById('help_modal')?.contains(document.activeElement) ?? false
    );
    expect(trappedInDialog).toBe(true);

    const focusOnWidget = await page.evaluate(
      () => document.getElementById('turnstile-widget')?.contains(document.activeElement) ?? false
    );
    expect(focusOnWidget).toBe(false);
  });
});
