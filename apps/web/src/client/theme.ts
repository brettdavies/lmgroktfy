import { addClass, removeClass, setAttribute, setText } from './dom';

/**
 * Light/dark theme switching with persistence. The `.dark` class on
 * `<html>` drives both daisyUI (`data-theme`) and Tailwind's `dark:` utilities
 * (via the `@custom-variant dark` override in `global.css`).
 */

const THEMES = { LIGHT: 'light', DARK: 'dark', SYSTEM: 'system' } as const;
type Theme = (typeof THEMES)[keyof typeof THEMES];

let currentTheme: Theme | null = null;

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

function effectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === THEMES.SYSTEM) return prefersDark() ? THEMES.DARK : THEMES.LIGHT;
  return theme;
}

function updateToggleButton(effective: 'light' | 'dark'): void {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  if (effective === THEMES.DARK) {
    setText(toggle, '☀️');
    setAttribute(toggle, 'aria-label', 'Switch to light theme');
    setAttribute(toggle, 'title', 'Switch to light theme');
  } else {
    setText(toggle, '🌙');
    setAttribute(toggle, 'aria-label', 'Switch to dark theme');
    setAttribute(toggle, 'title', 'Switch to dark theme');
  }
}

function setTheme(theme: Theme): void {
  currentTheme = theme;
  const effective = effectiveTheme(theme);
  const root = document.documentElement;

  if (effective === THEMES.DARK) {
    addClass(root, 'dark');
    removeClass(root, 'light');
    setAttribute(root, 'data-theme', 'dark');
  } else {
    addClass(root, 'light');
    removeClass(root, 'dark');
    setAttribute(root, 'data-theme', 'light');
  }

  updateToggleButton(effective);

  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Storage may be unavailable (private mode); the toggle still works in-session.
  }
}

function getTheme(): Theme {
  if (currentTheme) return currentTheme;
  const root = document.documentElement;
  if (root.getAttribute('data-theme') === 'dark') return THEMES.DARK;
  if (root.getAttribute('data-theme') === 'light') return THEMES.LIGHT;
  if (root.classList.contains('dark')) return THEMES.DARK;
  if (root.classList.contains('light')) return THEMES.LIGHT;
  return THEMES.SYSTEM;
}

function toggleTheme(): void {
  const current = getTheme();
  setTheme(current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);
}

function loadTheme(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('theme');
  } catch {
    saved = null;
  }
  setTheme(saved && (Object.values(THEMES) as string[]).includes(saved) ? (saved as Theme) : THEMES.SYSTEM);
}

export function initializeTheme(): void {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  loadTheme();

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener('change', () => {
    if (currentTheme === THEMES.SYSTEM) setTheme(THEMES.SYSTEM);
  });
}
