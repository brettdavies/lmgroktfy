import { z } from 'zod';
import { REQUEST_LIMITS, TURNSTILE } from '../constants/api';

/**
 * Schema for Grok API request.
 *
 * `turnstileToken` is required: the endpoint is a bot-gated proxy, so a request
 * without a challenge token can never be served. The length floor rejects an
 * absent or empty token cheaply; the endpoint still verifies the token against
 * Cloudflare siteverify before doing any work.
 */
export const GrokRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Question is required')
    .max(REQUEST_LIMITS.MAX_QUESTION_LENGTH, 'Question is too long'),
  turnstileToken: z
    .string()
    .min(TURNSTILE.MIN_TOKEN_LENGTH, 'Turnstile token is required')
    .max(TURNSTILE.MAX_TOKEN_LENGTH, 'Turnstile token is too long'),
});

/**
 * Schema for successful Grok API response
 */
export const GrokResponseSchema = z.object({
  answer: z.string(),
  shareId: z.string(),
});

/**
 * Schema for Grok API error response
 */
export const GrokErrorSchema = z.object({
  error: z.string(),
});

/**
 * Schema for xAI API chat completion response
 */
export const XAICompletionResponseSchema = z.object({
  id: z.string(),
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});
