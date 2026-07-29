import { BREAKPOINTS } from '@lmgroktfy/shared';
import { getIslandConfig } from './config';
import { addClass, elements, removeClass, setAttribute, setOpacity, setText } from './dom';
import { setSubmitButtonState } from './visibility';
import { enhanceForTouch } from './viewport';
import { hasUrlQuestion } from './question-url';

/**
 * Animated rotating placeholder. The `#custom-placeholder` overlay reveals each
 * localized suggestion while the input is empty and unfocused; it is suppressed
 * on a deep-link page (the input already carries the decoded question).
 */

interface PlaceholderState {
  input: HTMLInputElement | null;
  customPlaceholder: HTMLElement | null;
  placeholders: string[];
  currentIndex: number;
  rotationInterval: ReturnType<typeof setInterval> | null;
  hasUrlQuestion: boolean;
}

const state: PlaceholderState = {
  input: null,
  customPlaceholder: null,
  placeholders: [],
  currentIndex: 0,
  rotationInterval: null,
  hasUrlQuestion: false,
};

function isRTL(): boolean {
  return document.documentElement.getAttribute('dir') === 'rtl';
}

function applyRTLPosition(placeholder: HTMLElement): void {
  removeClass(placeholder, 'left-6');
  removeClass(placeholder, 'right-6');
  if (isRTL()) {
    addClass(placeholder, 'right-6');
    addClass(placeholder, 'text-right');
  } else {
    addClass(placeholder, 'left-6');
    removeClass(placeholder, 'text-right');
  }
}

function loadPlaceholders(): void {
  const configured = getIslandConfig().placeholders;
  state.placeholders = configured.length > 0 ? configured : [state.input?.placeholder ?? ''];
  if (state.currentIndex >= state.placeholders.length) state.currentIndex = 0;
}

function showPlaceholder(): void {
  const { customPlaceholder, input } = state;
  if (!customPlaceholder || !input) return;

  setText(customPlaceholder, state.placeholders[0]);
  setOpacity(customPlaceholder, 1);
  removeClass(customPlaceholder, 'opacity-0');
  removeClass(customPlaceholder, 'invisible');
  addClass(input, 'placeholder-hidden');
  applyRTLPosition(customPlaceholder);
}

function hidePlaceholder(): void {
  const { customPlaceholder, input } = state;
  if (!customPlaceholder || !input) return;
  setOpacity(customPlaceholder, 0);
  removeClass(input, 'placeholder-hidden');
}

function updatePlaceholderForInput(value: string): void {
  const { customPlaceholder: placeholder, input } = state;
  if (!placeholder || !input) return;

  if (value.trim().length > 0) {
    addClass(placeholder, 'opacity-0');
    addClass(placeholder, 'invisible');
    removeClass(input, 'placeholder-hidden');
    return;
  }

  removeClass(placeholder, 'opacity-0');
  removeClass(placeholder, 'invisible');
  applyRTLPosition(placeholder);
  addClass(input, 'placeholder-hidden');
}

function rotate(): void {
  const { input, customPlaceholder } = state;
  if (state.hasUrlQuestion || document.activeElement === input || input?.value) return;

  state.currentIndex = (state.currentIndex + 1) % state.placeholders.length;

  if (customPlaceholder) {
    removeClass(customPlaceholder, 'animate');
    void customPlaceholder.offsetWidth; // reflow so the reveal animation replays
    addClass(customPlaceholder, 'animate');
    setText(customPlaceholder, state.placeholders[state.currentIndex]);
  }
  if (input) setAttribute(input, 'placeholder', state.placeholders[state.currentIndex]);
}

function startRotation(): void {
  state.rotationInterval = setInterval(rotate, 3000);
}

function stopRotation(): void {
  if (state.rotationInterval) {
    clearInterval(state.rotationInterval);
    state.rotationInterval = null;
  }
}

function setupEvents(): void {
  const { input } = state;
  if (!input) return;

  const sync = () => updatePlaceholderForInput(input.value);
  input.addEventListener('input', sync);
  input.addEventListener('focus', sync);
  input.addEventListener('blur', sync);
}

function initMobileSupport(): void {
  const applyMobileClass = () => {
    if (!state.customPlaceholder) return;
    if (window.innerWidth < BREAKPOINTS.MOBILE) {
      addClass(state.customPlaceholder, 'mobile-placeholder');
    } else {
      removeClass(state.customPlaceholder, 'mobile-placeholder');
    }
  };

  if (window.innerWidth < BREAKPOINTS.MOBILE) {
    enhanceForTouch(state.input);
    enhanceForTouch(elements.submitButton());
    applyMobileClass();
  }
  window.addEventListener('resize', applyMobileClass);
}

export function initializePlaceholder(): void {
  state.input = elements.question();
  state.customPlaceholder = elements.customPlaceholder();
  loadPlaceholders();

  state.hasUrlQuestion = hasUrlQuestion();

  setupEvents();

  if (state.hasUrlQuestion) {
    hidePlaceholder();
  } else {
    showPlaceholder();
    startRotation();
  }

  initMobileSupport();
}

export function resetPlaceholder(): void {
  state.hasUrlQuestion = false;
  state.currentIndex = 0;
  stopRotation();

  const { customPlaceholder, input } = state;
  if (customPlaceholder && input) {
    setText(customPlaceholder, state.placeholders[0]);
    setAttribute(input, 'placeholder', state.placeholders[0]);
    showPlaceholder();
  }

  setSubmitButtonState(false);
  startRotation();
}
