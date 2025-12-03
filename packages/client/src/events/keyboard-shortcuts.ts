import { elements } from '../ui';

/**
 * Sets up global keyboard shortcuts for the application.
 */
export function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e: KeyboardEvent): void {
  if (shouldIgnoreKeypress()) return;

  const responseVisible = isResponseVisible();

  switch (e.key) {
    case '?':
    case '/':
      handleFocusSearch(e);
      break;
    case 'h':
      handleOpenHelp(e);
      break;
    case 't':
      handleToggleTheme(e);
      break;
    case 'c':
      if (responseVisible) handleCopyAnswer(e);
      break;
    case 'q':
      if (responseVisible) handleCopyQA(e);
      break;
    case 's':
      if (responseVisible) handleCopyShare(e);
      break;
    case 'g':
      if (responseVisible) handleContinueOnGrok(e);
      break;
  }
}

function shouldIgnoreKeypress(): boolean {
  const isInInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? '');
  const isModalOpen = document.querySelector('dialog[open]') !== null;
  return isInInput || isModalOpen;
}

function isResponseVisible(): boolean {
  const responseElement = elements.response();
  return responseElement !== null && !responseElement.classList.contains('hidden');
}

function handleFocusSearch(e: KeyboardEvent): void {
  e.preventDefault();
  elements.question()?.focus();
}

function handleOpenHelp(e: KeyboardEvent): void {
  e.preventDefault();
  document.querySelector<HTMLButtonElement>('button[aria-label="How to use"]')?.click();
}

function handleToggleTheme(e: KeyboardEvent): void {
  e.preventDefault();
  document.getElementById('theme-toggle')?.click();
}

function handleCopyAnswer(e: KeyboardEvent): void {
  e.preventDefault();
  elements.buttons.copyAnswer()?.click();
}

function handleCopyQA(e: KeyboardEvent): void {
  e.preventDefault();
  elements.buttons.copyQA()?.click();
}

function handleCopyShare(e: KeyboardEvent): void {
  e.preventDefault();
  elements.buttons.share()?.click();
}

function handleContinueOnGrok(e: KeyboardEvent): void {
  e.preventDefault();
  const continueLink = elements.buttons.continueLink();
  if (continueLink?.href) {
    window.open(continueLink.href, '_blank');
  }
}
