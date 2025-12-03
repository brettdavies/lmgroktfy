import { addClass, removeClass, setOpacity, setText } from '../../ui';
import { applyRTLPosition, isRTL } from './rtl';
import { state } from './state';

/**
 * Placeholder visibility management.
 */

export function updatePlaceholderForInput(inputValue: string): void {
  const placeholder = state.elements.customPlaceholder;
  const input = state.elements.input;

  if (!placeholder || !input) return;

  if (inputValue && inputValue.trim().length > 0) {
    addClass(placeholder, 'opacity-0');
    addClass(placeholder, 'invisible');
    removeClass(input, 'placeholder-hidden');
  } else {
    removeClass(placeholder, 'opacity-0');
    removeClass(placeholder, 'invisible');

    removeClass(placeholder, 'left-6');
    removeClass(placeholder, 'right-6');

    if (isRTL()) {
      addClass(placeholder, 'right-6');
      addClass(placeholder, 'text-right');
      addClass(input, 'placeholder-hidden');
    } else {
      addClass(placeholder, 'left-6');
      removeClass(placeholder, 'text-right');
      addClass(input, 'placeholder-hidden');
    }
  }
}

export function showPlaceholder(): void {
  const { customPlaceholder, input } = state.elements;

  if (!customPlaceholder || !input) return;

  setText(customPlaceholder, state.placeholders[0]);
  setOpacity(customPlaceholder, 1);
  removeClass(customPlaceholder, 'opacity-0');
  removeClass(customPlaceholder, 'invisible');
  addClass(input, 'placeholder-hidden');
  applyRTLPosition(customPlaceholder);
}

export function hidePlaceholder(): void {
  const { customPlaceholder, input } = state.elements;

  if (!customPlaceholder || !input) return;

  setOpacity(customPlaceholder, 0);
  removeClass(input, 'placeholder-hidden');
}
