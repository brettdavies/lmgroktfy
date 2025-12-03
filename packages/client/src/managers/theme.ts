import { addClass, removeClass, setAttribute, setText } from '../ui';

/**
 * Theme Manager - handles light/dark theme switching and persistence.
 */

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

let currentTheme: Theme | null = null;

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === THEMES.SYSTEM) {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? THEMES.DARK : THEMES.LIGHT;
  }
  return theme;
}

function updateThemeToggleButton(effectiveTheme: 'light' | 'dark'): void {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  if (effectiveTheme === THEMES.DARK) {
    setText(themeToggle, '☀️');
    setAttribute(themeToggle, 'aria-label', 'Switch to light theme');
    setAttribute(themeToggle, 'title', 'Switch to light theme');
  } else {
    setText(themeToggle, '🌙');
    setAttribute(themeToggle, 'aria-label', 'Switch to dark theme');
    setAttribute(themeToggle, 'title', 'Switch to dark theme');
  }
}

function dispatchThemeChangeEvent(theme: string): void {
  const event = new CustomEvent('themechange', { detail: { theme } });
  document.dispatchEvent(event);
}

export function setTheme(theme: Theme): void {
  if (!Object.values(THEMES).includes(theme)) {
    console.error(`Invalid theme: ${theme}`);
    return;
  }

  currentTheme = theme;
  const effectiveTheme = getEffectiveTheme(theme);

  if (effectiveTheme === THEMES.DARK) {
    addClass(document.documentElement, 'dark');
    removeClass(document.documentElement, 'light');
    addClass(document.body, 'dark-theme');
    removeClass(document.body, 'light-theme');
    setAttribute(document.documentElement, 'data-theme', 'dark');
  } else {
    addClass(document.documentElement, 'light');
    removeClass(document.documentElement, 'dark');
    addClass(document.body, 'light-theme');
    removeClass(document.body, 'dark-theme');
    setAttribute(document.documentElement, 'data-theme', 'light');
  }

  updateThemeToggleButton(effectiveTheme);

  try {
    localStorage.setItem('theme', currentTheme);
  } catch (error) {
    console.error('Failed to save theme preference:', error);
  }

  dispatchThemeChangeEvent(effectiveTheme);
}

export function getTheme(): Theme {
  if (currentTheme) return currentTheme;

  const dataTheme = document.documentElement.getAttribute('data-theme');
  if (dataTheme) {
    return dataTheme === 'dark' ? THEMES.DARK : THEMES.LIGHT;
  }

  if (document.documentElement.classList.contains('dark')) return THEMES.DARK;
  if (document.documentElement.classList.contains('light')) return THEMES.LIGHT;
  if (document.body.classList.contains('dark-theme')) return THEMES.DARK;
  if (document.body.classList.contains('light-theme')) return THEMES.LIGHT;

  return THEMES.SYSTEM;
}

export function toggleTheme(): void {
  const current = getTheme();
  if (current === THEMES.LIGHT || current === THEMES.SYSTEM) {
    setTheme(THEMES.DARK);
  } else {
    setTheme(THEMES.LIGHT);
  }
}

function loadTheme(): void {
  try {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      setTheme(THEMES.SYSTEM);
    }
  } catch {
    setTheme(THEMES.SYSTEM);
  }
}

function setupSystemPreferenceListener(): void {
  if (!window.matchMedia) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (currentTheme === THEMES.SYSTEM) {
      setTheme(THEMES.SYSTEM);
    }
  });
}

export function initializeTheme(): void {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  loadTheme();
  setupSystemPreferenceListener();
}

export const ThemeManager = {
  THEMES,
  setTheme,
  getTheme,
  toggleTheme,
  initialize: initializeTheme,
};
