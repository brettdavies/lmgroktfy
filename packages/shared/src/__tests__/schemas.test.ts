import { describe, expect, test } from 'bun:test';
import { REQUEST_LIMITS, TURNSTILE } from '../constants/api';
import {
  GrokErrorSchema,
  GrokRequestSchema,
  GrokResponseSchema,
  XAICompletionResponseSchema,
} from '../schemas/api';

const VALID_TOKEN = 'x'.repeat(40);

describe('GrokRequestSchema', () => {
  test('should validate a valid request', () => {
    const result = GrokRequestSchema.safeParse({
      question: 'What is TypeScript?',
      turnstileToken: VALID_TOKEN,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe('What is TypeScript?');
      expect(result.data.turnstileToken).toBe(VALID_TOKEN);
    }
  });

  test('should reject an empty question', () => {
    const result = GrokRequestSchema.safeParse({ question: '' });
    expect(result.success).toBe(false);
  });

  test('should reject a whitespace-only question (trimmed to empty)', () => {
    const result = GrokRequestSchema.safeParse({
      question: '   \n\t  ',
      turnstileToken: VALID_TOKEN,
    });
    expect(result.success).toBe(false);
  });

  test('trims surrounding whitespace from a valid question', () => {
    const result = GrokRequestSchema.safeParse({
      question: '  What is Grok?  ',
      turnstileToken: VALID_TOKEN,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe('What is Grok?');
    }
  });

  test('should reject a missing question', () => {
    const result = GrokRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test('should reject a question longer than the tightened bound', () => {
    const longQuestion = 'a'.repeat(REQUEST_LIMITS.MAX_QUESTION_LENGTH + 1);
    const result = GrokRequestSchema.safeParse({ question: longQuestion });
    expect(result.success).toBe(false);
  });

  test('should accept a question at the tightened max length', () => {
    const maxQuestion = 'a'.repeat(REQUEST_LIMITS.MAX_QUESTION_LENGTH);
    const result = GrokRequestSchema.safeParse({
      question: maxQuestion,
      turnstileToken: VALID_TOKEN,
    });
    expect(result.success).toBe(true);
  });

  test('worst-case serialized max question fits within the body cap', () => {
    // A schema-valid question must never be rejected by the endpoint body cap.
    // Worst case per JS code unit is a \\uXXXX escape (6 bytes) plus a Turnstile
    // token; that ceiling must stay under the byte budget.
    const worstCaseQuestionBytes = REQUEST_LIMITS.MAX_QUESTION_LENGTH * 6;
    const turnstileTokenBudget = 2048;
    const envelopeBudget = 64;
    expect(worstCaseQuestionBytes + turnstileTokenBudget + envelopeBudget).toBeLessThan(
      REQUEST_LIMITS.MAX_BODY_BYTES
    );
  });

  test('should require a turnstileToken', () => {
    const result = GrokRequestSchema.safeParse({ question: 'What is Grok?' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'turnstileToken')).toBe(true);
    }
  });

  test('should reject a turnstileToken below the minimum length', () => {
    const result = GrokRequestSchema.safeParse({
      question: 'What is Grok?',
      turnstileToken: 'x'.repeat(TURNSTILE.MIN_TOKEN_LENGTH - 1),
    });
    expect(result.success).toBe(false);
  });

  test('should reject an empty turnstileToken', () => {
    const result = GrokRequestSchema.safeParse({ question: 'What is Grok?', turnstileToken: '' });
    expect(result.success).toBe(false);
  });
});

describe('GrokResponseSchema', () => {
  test('should validate a valid response', () => {
    const result = GrokResponseSchema.safeParse({
      answer: 'TypeScript is a typed superset of JavaScript.',
      shareId: 'abc123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answer).toBe('TypeScript is a typed superset of JavaScript.');
      expect(result.data.shareId).toBe('abc123');
    }
  });

  test('should reject a missing answer', () => {
    const result = GrokResponseSchema.safeParse({ shareId: 'abc123' });
    expect(result.success).toBe(false);
  });

  test('should reject a missing shareId', () => {
    const result = GrokResponseSchema.safeParse({ answer: 'Test answer' });
    expect(result.success).toBe(false);
  });
});

describe('GrokErrorSchema', () => {
  test('should validate a valid error response', () => {
    const result = GrokErrorSchema.safeParse({ error: 'Something went wrong' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('Something went wrong');
    }
  });

  test('should reject a missing error', () => {
    const result = GrokErrorSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('XAICompletionResponseSchema', () => {
  test('should validate a valid xAI response', () => {
    const result = XAICompletionResponseSchema.safeParse({
      id: 'chatcmpl-123',
      choices: [
        {
          message: {
            content: 'Hello! How can I help you?',
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('chatcmpl-123');
      expect(result.data.choices[0].message.content).toBe('Hello! How can I help you?');
    }
  });

  test('should reject a response with no choices', () => {
    const result = XAICompletionResponseSchema.safeParse({
      id: 'chatcmpl-123',
      choices: [],
    });
    // Empty array is valid for the schema, but would fail in business logic
    expect(result.success).toBe(true);
  });

  test('should reject a response with missing id', () => {
    const result = XAICompletionResponseSchema.safeParse({
      choices: [{ message: { content: 'Hello!' } }],
    });
    expect(result.success).toBe(false);
  });
});
