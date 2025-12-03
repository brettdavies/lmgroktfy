/**
 * Placeholder state management.
 */

export interface PlaceholderElements {
  input: HTMLInputElement | null;
  submitButton: HTMLButtonElement | null;
  customPlaceholder: HTMLElement | null;
}

export interface PlaceholderState {
  elements: PlaceholderElements;
  placeholders: string[];
  currentIndex: number;
  rotationInterval: ReturnType<typeof setInterval> | null;
  hasUrlQuestion: boolean;
}

export const state: PlaceholderState = {
  elements: {
    input: null,
    submitButton: null,
    customPlaceholder: null,
  },
  placeholders: [],
  currentIndex: 0,
  rotationInterval: null,
  hasUrlQuestion: false,
};
