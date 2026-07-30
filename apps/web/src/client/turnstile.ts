/**
 * Turnstile token seam.
 *
 * The managed Turnstile widget (rendered by a later unit) writes its token into
 * a hidden `input[name="cf-turnstile-response"]` when its challenge resolves.
 * The island never POSTs `/api/grok` without that token, so the auto-submit
 * (deep-link) path must AWAIT it — the widget resolves asynchronously, and a
 * load-time POST before the token exists would be rejected.
 *
 * The contract is the hidden input alone: anything that populates
 * `cf-turnstile-response` (the real widget, or a test that injects the input)
 * satisfies it, so no bespoke callback API is required.
 */

const TOKEN_FIELD_NAME = 'cf-turnstile-response';
const DEFAULT_TIMEOUT_MS = 10000;
const POLL_INTERVAL_MS = 100;

/** Current token, or an empty string when the widget has not resolved one yet. */
export function getTurnstileToken(): string {
  const input = document.querySelector<HTMLInputElement>(`input[name="${TOKEN_FIELD_NAME}"]`);
  return input?.value.trim() ?? '';
}

/**
 * Resolves with the Turnstile token once the hidden input is populated. Resolves
 * immediately when a token is already present. Resolves with an empty string on
 * timeout so the caller can fail visibly rather than POST unverified. Polling
 * (not a MutationObserver) is deliberate: the widget sets the input's `value`
 * property, which does not fire attribute mutations.
 */
export function awaitTurnstileToken(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> {
  const existing = getTurnstileToken();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (token: string): void => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(timer);
      resolve(token);
    };

    const poll = setInterval(() => {
      const token = getTurnstileToken();
      if (token) finish(token);
    }, POLL_INTERVAL_MS);

    const timer = setTimeout(() => finish(''), timeoutMs);
  });
}
