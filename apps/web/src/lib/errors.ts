/** Name-and-message error text for server-side logging; never returned to a client. */
export function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** True when a fetch failed because its own timeout controller aborted it. */
export function isAbort(controller: AbortController, error: unknown): boolean {
  return controller.signal.aborted || (error instanceof Error && error.name === 'AbortError');
}
