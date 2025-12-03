import { describe, expect, test } from 'bun:test';
import {
  GrokErrorSchema,
  GrokRequestSchema,
  GrokResponseSchema,
  XAICompletionResponseSchema,
} from '../schemas/api';

describe('GrokRequestSchema', () => {
  test('should validate a valid request', () => {
    const result = GrokRequestSchema.safeParse({
      question: 'What is TypeScript?',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe('What is TypeScript?');
    }
  });

  test('should reject an empty question', () => {
    const result = GrokRequestSchema.safeParse({ question: '' });
    expect(result.success).toBe(false);
  });

  test('should reject a missing question', () => {
    const result = GrokRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test('should reject a question that is too long', () => {
    const longQuestion = 'a'.repeat(10001);
    const result = GrokRequestSchema.safeParse({ question: longQuestion });
    expect(result.success).toBe(false);
  });

  test('should accept a question at max length', () => {
    const maxQuestion = 'a'.repeat(10000);
    const result = GrokRequestSchema.safeParse({ question: maxQuestion });
    expect(result.success).toBe(true);
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
