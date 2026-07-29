import { z } from 'zod';
import { REQUEST_LIMITS } from '../constants/api';

/**
 * Schema for Grok API request
 */
export const GrokRequestSchema = z.object({
  question: z
    .string()
    .min(1, 'Question is required')
    .max(REQUEST_LIMITS.MAX_QUESTION_LENGTH, 'Question is too long'),
  // Accepted but not yet enforced by the endpoint.
  turnstileToken: z.string().optional(),
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
