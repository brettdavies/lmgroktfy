import { GrokRequestSchema } from '../schemas/api';

/**
 * Validates a Grok request body
 * @param data - The data to validate
 * @returns SafeParseReturnType with success status and parsed data or error
 */
export function validateGrokRequest(data: unknown) {
  return GrokRequestSchema.safeParse(data);
}

/**
 * Checks if a value is a non-empty string
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
