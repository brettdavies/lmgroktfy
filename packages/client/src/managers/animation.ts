import { addClass, removeClass, removeStyle, setStyle } from '../ui';

/**
 * Animation Manager - handles animations and transitions with reduced motion support.
 */

export const DURATIONS = {
  SHORT: 150,
  MEDIUM: 300,
  LONG: 500,
} as const;

export const EASINGS = {
  LINEAR: 'linear',
  EASE: 'ease',
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
} as const;

export const ANIMATIONS = {
  FADE_IN: 'fade-in',
  FADE_OUT: 'fade-out',
  SLIDE_IN: 'slide-in',
  SLIDE_OUT: 'slide-out',
  SCALE_IN: 'scale-in',
  SCALE_OUT: 'scale-out',
  PULSE: 'pulse',
  SHAKE: 'shake',
  BOUNCE: 'bounce',
} as const;

export type AnimationType = (typeof ANIMATIONS)[keyof typeof ANIMATIONS];
export type Duration = (typeof DURATIONS)[keyof typeof DURATIONS];
export type Easing = (typeof EASINGS)[keyof typeof EASINGS];

interface AnimationOptions {
  duration?: number;
  easing?: string;
  direction?: 'normal' | 'reverse';
  onComplete?: () => void;
}

interface TransitionOptions {
  duration?: number;
  easing?: string;
  onComplete?: () => void;
}

let prefersReducedMotion = false;

function checkReducedMotionPreference(): void {
  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getAnimationClassName(animationType: AnimationType, direction: string): string {
  const classMap: Record<string, string> = {
    [ANIMATIONS.FADE_IN]: 'animate-fade-in',
    [ANIMATIONS.FADE_OUT]: 'animate-fade-out',
    [ANIMATIONS.SLIDE_IN]:
      direction === 'reverse' ? 'animate-slide-in-left' : 'animate-slide-in-right',
    [ANIMATIONS.SLIDE_OUT]:
      direction === 'reverse' ? 'animate-slide-out-left' : 'animate-slide-out-right',
    [ANIMATIONS.SCALE_IN]: 'animate-scale-in',
    [ANIMATIONS.SCALE_OUT]: 'animate-scale-out',
    [ANIMATIONS.PULSE]: 'animate-pulse',
    [ANIMATIONS.SHAKE]: 'animate-shake',
    [ANIMATIONS.BOUNCE]: 'animate-bounce',
  };

  return classMap[animationType] ?? '';
}

export function animate(
  element: HTMLElement,
  animationType: AnimationType,
  options: AnimationOptions = {}
): Promise<void> {
  if (!element) return Promise.reject(new Error('Element not found'));

  if (prefersReducedMotion) {
    options.onComplete?.();
    return Promise.resolve();
  }

  const duration = options.duration ?? DURATIONS.MEDIUM;
  const easing = options.easing ?? EASINGS.EASE;
  const direction = options.direction ?? 'normal';

  setStyle(element, '--animation-duration', `${duration}ms`);
  setStyle(element, '--animation-easing', easing);

  const className = getAnimationClassName(animationType, direction);
  if (!className) {
    return Promise.reject(new Error(`Unknown animation type: ${animationType}`));
  }

  addClass(element, className);

  return new Promise((resolve) => {
    const handleAnimationEnd = (): void => {
      removeClass(element, className);
      element.removeEventListener('animationend', handleAnimationEnd);
      options.onComplete?.();
      resolve();
    };

    element.addEventListener('animationend', handleAnimationEnd);
  });
}

export function transition(
  element: HTMLElement,
  properties: Record<string, string>,
  options: TransitionOptions = {}
): Promise<void> {
  if (!element) return Promise.reject(new Error('Element not found'));

  if (prefersReducedMotion) {
    for (const [prop, value] of Object.entries(properties)) {
      setStyle(element, prop, value);
    }
    options.onComplete?.();
    return Promise.resolve();
  }

  const duration = options.duration ?? DURATIONS.MEDIUM;
  const easing = options.easing ?? EASINGS.EASE;

  setStyle(element, '--transition-duration', `${duration}ms`);
  setStyle(element, '--transition-easing', easing);

  let transitionClass = 'transition-all';
  const propKeys = Object.keys(properties);
  if (propKeys.length === 1) {
    if (propKeys[0] === 'opacity') transitionClass = 'transition-opacity';
    else if (propKeys[0] === 'transform') transitionClass = 'transition-transform';
  }

  addClass(element, transitionClass);

  return new Promise((resolve) => {
    const handleTransitionEnd = (): void => {
      removeClass(element, transitionClass);
      element.removeEventListener('transitionend', handleTransitionEnd);
      options.onComplete?.();
      resolve();
    };

    requestAnimationFrame(() => {
      for (const [prop, value] of Object.entries(properties)) {
        setStyle(element, prop, value);
      }

      if (getComputedStyle(element).transitionDuration === '0s') {
        handleTransitionEnd();
      } else {
        element.addEventListener('transitionend', handleTransitionEnd, {
          once: true,
        });
        setTimeout(handleTransitionEnd, duration + 50);
      }
    });
  });
}

export function stopAnimation(element: HTMLElement): void {
  if (!element) return;

  const animationClasses = [
    'animate-fade-in',
    'animate-fade-out',
    'animate-slide-in-right',
    'animate-slide-out-right',
    'animate-slide-in-left',
    'animate-slide-out-left',
    'animate-scale-in',
    'animate-scale-out',
    'animate-pulse',
    'animate-shake',
    'animate-bounce',
    'transition-all',
    'transition-opacity',
    'transition-transform',
  ];

  for (const cls of animationClasses) {
    removeClass(element, cls);
  }

  setStyle(element, 'animation', 'none');
  setStyle(element, 'transition', 'none');
  void element.offsetWidth; // Force reflow
  removeStyle(element, 'animation');
  removeStyle(element, 'transition');
}

export function initializeAnimations(): void {
  checkReducedMotionPreference();

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', checkReducedMotionPreference);
}

export const AnimationManager = {
  DURATIONS,
  EASINGS,
  ANIMATIONS,
  animate,
  transition,
  stopAnimation,
  initialize: initializeAnimations,
};
