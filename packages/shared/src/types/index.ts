import type { z } from 'zod';
import type {
  EnvConfigSchema,
  GrokErrorSchema,
  GrokRequestSchema,
  GrokResponseSchema,
  LocalConfigSchema,
  XAICompletionResponseSchema,
} from '../schemas';

// API Types (inferred from Zod schemas)
export type GrokRequest = z.infer<typeof GrokRequestSchema>;
export type GrokResponse = z.infer<typeof GrokResponseSchema>;
export type GrokError = z.infer<typeof GrokErrorSchema>;
export type XAICompletionResponse = z.infer<typeof XAICompletionResponseSchema>;

// Config Types (inferred from Zod schemas)
export type LocalConfig = z.infer<typeof LocalConfigSchema>;
export type EnvConfig = z.infer<typeof EnvConfigSchema>;

// DOM Element Types
export type ElementGetter<T extends HTMLElement = HTMLElement> = () => T | null;

export interface ButtonElements {
  continueLink: ElementGetter<HTMLAnchorElement>;
  useGrok: ElementGetter<HTMLAnchorElement>;
  share: ElementGetter<HTMLButtonElement>;
  copyQA: ElementGetter<HTMLButtonElement>;
  copyAnswer: ElementGetter<HTMLButtonElement>;
  shareOnX: ElementGetter<HTMLButtonElement>;
}

export interface UIElements {
  question: ElementGetter<HTMLInputElement>;
  answer: ElementGetter<HTMLElement>;
  loading: ElementGetter<HTMLElement>;
  response: ElementGetter<HTMLElement>;
  questionForm: ElementGetter<HTMLFormElement>;
  toast: ElementGetter<HTMLElement>;
  toastMessage: ElementGetter<HTMLElement>;
  questionDisplay: ElementGetter<HTMLElement>;
  customPlaceholder: ElementGetter<HTMLElement>;
  submitButton: ElementGetter<HTMLButtonElement>;
  buttons: ButtonElements;
}

// i18n Types
export interface TranslationData {
  [key: string]: string | TranslationData;
}

export interface I18nConfig {
  defaultLocale: string;
  supportedLocales: readonly string[];
}
