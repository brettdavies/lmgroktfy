import { elements } from './dom';
import { openHelpDialog } from './events';

/**
 * Global keyboard shortcuts. Ignored while typing in a field or while a dialog
 * is open. Answer-scoped shortcuts (copy/share/continue) act only once a
 * response is on screen.
 */

export function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', handleKeydown);
}

function shouldIgnore(): boolean {
  const tag = document.activeElement?.tagName ?? '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';
  const dialogOpen = document.querySelector('dialog[open]') !== null;
  return typing || dialogOpen;
}

function responseVisible(): boolean {
  const response = elements.response();
  return response !== null && !response.classList.contains('hidden');
}

function handleKeydown(event: KeyboardEvent): void {
  if (shouldIgnore()) return;
  const visible = responseVisible();

  switch (event.key) {
    case '/':
      event.preventDefault();
      elements.question()?.focus();
      break;
    case '?':
    case 'h':
      event.preventDefault();
      openHelpDialog();
      break;
    case 't':
      event.preventDefault();
      document.getElementById('theme-toggle')?.click();
      break;
    case 'c':
      if (visible) {
        event.preventDefault();
        elements.buttons.copyAnswer()?.click();
      }
      break;
    case 'q':
      if (visible) {
        event.preventDefault();
        elements.buttons.copyQA()?.click();
      }
      break;
    case 's':
      if (visible) {
        event.preventDefault();
        elements.buttons.share()?.click();
      }
      break;
    case 'g':
      if (visible) {
        event.preventDefault();
        const link = elements.buttons.continueLink();
        if (link?.href) window.open(link.href, '_blank');
      }
      break;
  }
}
