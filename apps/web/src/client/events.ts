import { submitQuestion } from './api';
import { copyText, getShareableText } from './clipboard';
import { disableButton, elements, enableButton } from './dom';
import { clearFocusTrap, setFocus, trapFocus } from './focus';
import { resetPlaceholder } from './placeholder';
import { decodeQuestionFromPath, localizedPath } from './question-url';
import { resetUI } from './transitions';
import { checkViewport } from './viewport';
import { setSubmitButtonState } from './visibility';

/**
 * Event wiring for the interactive surface: form submission, the deep-link
 * auto-submit, input tracking, share/copy buttons, the help dialog, the home
 * link, the language switcher, and orientation changes.
 */

export function setupFormSubmission(): void {
  const form = elements.questionForm();
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const submitButton = elements.submitButton();
    disableButton(submitButton);

    const question = elements.question()?.value ?? '';
    void submitQuestion(question).finally(() => {
      enableButton(submitButton);
      setTimeout(() => {
        setSubmitButtonState((elements.question()?.value.trim().length ?? 0) > 0);
      }, 100);
    });
  });
}

/**
 * Deep-link path (`/your+question`): decode the question, populate the input,
 * and submit. `submitQuestion` gates the POST on a Turnstile token, so this
 * never fires before the token exists.
 */
export function processUrlParameters(): void {
  const question = decodeQuestionFromPath();
  if (!question) return;

  const input = elements.question();
  if (input) input.value = question;

  setSubmitButtonState(true);
  void submitQuestion(question);
}

export function setupInputTracking(): void {
  const input = elements.question();
  if (!input) return;

  input.addEventListener('input', () => {
    const hasValue = input.value.trim().length > 0;
    setTimeout(() => setSubmitButtonState(hasValue), 20);
  });
}

export function setupCopyButtons(): void {
  elements.buttons.copyQA()?.addEventListener('click', () => {
    void copyText(getShareableText('qa'), 'copy_qa');
  });
  elements.buttons.copyAnswer()?.addEventListener('click', () => {
    void copyText(getShareableText('answer'), 'copy_answer');
  });
  elements.buttons.share()?.addEventListener('click', () => {
    void copyText(getShareableText('url'), 'copy_link');
  });
  elements.buttons.shareOnX()?.addEventListener('click', () => {
    const text = getShareableText('tweet');
    const shareUrl = getShareableText('shareUrl');
    window.open(`https://x.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank');
  });
}

export function setupHomeLink(): void {
  const homeLink = document.querySelector<HTMLAnchorElement>('.home-link');
  if (!homeLink) return;

  homeLink.addEventListener('click', (event) => {
    event.preventDefault();
    resetUI(homeLink.getAttribute('href') ?? '/');
    resetPlaceholder();

    setTimeout(() => {
      const input = elements.question();
      setSubmitButtonState((input?.value.trim().length ?? 0) > 0);
      if (input) setFocus(input);
    }, 100);
  });
}

export function setupLanguageSwitcher(): void {
  const select = document.getElementById('language-switcher') as HTMLSelectElement | null;
  if (!select) return;

  select.addEventListener('change', () => {
    const target = localizedPath(select.value);
    if (target !== window.location.pathname) window.location.assign(target);
  });
}

/** Opens the help dialog and traps focus, restoring focus to `returnTo` on close. */
export function openHelpDialog(returnTo?: HTMLElement | null): void {
  const dialog = document.getElementById('help_modal') as HTMLDialogElement | null;
  if (!dialog) return;

  const opener = returnTo ?? (document.activeElement as HTMLElement | null);
  dialog.showModal();
  trapFocus(dialog, opener);
}

export function setupHelpDialog(): void {
  const dialog = document.getElementById('help_modal') as HTMLDialogElement | null;
  if (!dialog) return;

  document
    .querySelector<HTMLButtonElement>('button[aria-label="How to use"]')
    ?.addEventListener('click', (event) => openHelpDialog(event.currentTarget as HTMLElement));

  // A native `<form method="dialog">` close button restores focus itself; just
  // release the Tab trap so it does not stay armed after the dialog closes.
  dialog.addEventListener('close', clearFocusTrap);
}

export function setupOrientationHandling(): void {
  window.addEventListener('orientationchange', () => {
    setTimeout(checkViewport, 100);
  });
}
