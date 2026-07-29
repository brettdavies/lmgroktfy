import { DELAYS, ELEMENT_IDS } from '@lmgroktfy/shared';
import { setAttribute, setStyle, setText } from './dom';

/**
 * Screen-reader announcements via a single visually-hidden live region. The
 * region is created lazily (the server does not prerender it) and its text is
 * cleared before each message so assistive tech re-announces identical strings.
 */

export function setAriaAttribute(element: HTMLElement | null, name: string, value: string): void {
  if (!element) return;
  element.setAttribute(`aria-${name}`, value);
}

function getOrCreateAnnouncer(): HTMLElement {
  let announcer = document.getElementById(ELEMENT_IDS.SR_ANNOUNCER);
  if (announcer) return announcer;

  announcer = document.createElement('div');
  setAttribute(announcer, 'id', ELEMENT_IDS.SR_ANNOUNCER);
  setAriaAttribute(announcer, 'live', 'polite');
  setAriaAttribute(announcer, 'atomic', 'true');
  setStyle(announcer, 'position', 'absolute');
  setStyle(announcer, 'width', '1px');
  setStyle(announcer, 'height', '1px');
  setStyle(announcer, 'padding', '0');
  setStyle(announcer, 'overflow', 'hidden');
  setStyle(announcer, 'clip', 'rect(0, 0, 0, 0)');
  setStyle(announcer, 'white-space', 'nowrap');
  setStyle(announcer, 'border', '0');
  document.body.appendChild(announcer);
  return announcer;
}

export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcer = getOrCreateAnnouncer();
  setAriaAttribute(announcer, 'live', priority);
  setText(announcer, '');
  setTimeout(() => setText(announcer, message), DELAYS.SR_ANNOUNCEMENT);
}
