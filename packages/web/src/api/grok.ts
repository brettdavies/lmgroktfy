import {
  GROK_API,
  type GrokError,
  type GrokResponse,
  GrokResponseSchema,
  HEADERS,
  HTTP_STATUS,
  XAICompletionResponseSchema,
  validateGrokRequest,
} from '@lmgroktfy/shared';
import type { Env } from '../types';

/**
 * Handles POST requests to /api/grok
 */
export async function handleGrokRequest(request: Request, env: Env): Promise<Response> {
  // Validate request method
  if (request.method !== 'POST') {
    return createErrorResponse('Method not allowed', HTTP_STATUS.METHOD_NOT_ALLOWED);
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateGrokRequest(body);

    if (!validation.success) {
      const errorMessage = validation.error.errors.map((e) => e.message).join(', ');
      return createErrorResponse(errorMessage, HTTP_STATUS.BAD_REQUEST);
    }

    const { question } = validation.data;

    // Call xAI API
    const apiResponse = await fetch(GROK_API.URL, {
      method: 'POST',
      headers: {
        [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
        [HEADERS.AUTHORIZATION]: `Bearer ${env.API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_API.MODEL,
        messages: [
          { role: 'system', content: GROK_API.SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        stream: GROK_API.STREAM,
        temperature: GROK_API.TEMPERATURE,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return createErrorResponse(
        `xAI API error: ${apiResponse.status} - ${errorText}`,
        apiResponse.status
      );
    }

    // Parse and validate API response
    const data = await apiResponse.json();
    const completionValidation = XAICompletionResponseSchema.safeParse(data);

    if (!completionValidation.success) {
      return createErrorResponse(
        'Invalid response from xAI API',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    const { choices, id } = completionValidation.data;
    const answer = choices[0]?.message?.content || 'No answer provided';

    const response: GrokResponse = {
      answer,
      shareId: id,
    };

    // Validate our own response before sending
    const responseValidation = GrokResponseSchema.safeParse(response);
    if (!responseValidation.success) {
      return createErrorResponse('Failed to format response', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return new Response(JSON.stringify(responseValidation.data), {
      status: HTTP_STATUS.OK,
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Server error: ${message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

function createErrorResponse(error: string, status: number): Response {
  const body: GrokError = { error };
  return new Response(JSON.stringify(body), {
    status,
    headers: { [HEADERS.CONTENT_TYPE]: HEADERS.JSON },
  });
}
