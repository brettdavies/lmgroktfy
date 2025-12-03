import { z } from 'zod';

/**
 * Schema for local development configuration
 */
export const LocalConfigSchema = z.object({
  apiBaseUrl: z.string().url().optional(),
  debugMode: z.boolean().optional().default(false),
  port: z.number().int().positive().optional().default(3000),
});

/**
 * Schema for environment configuration
 */
export const EnvConfigSchema = z.object({
  ENVIRONMENT: z.enum(['development', 'production']).optional().default('production'),
  API_KEY: z.string().min(1).optional(),
});
