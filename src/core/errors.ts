/**
 * Wrap an error with context about what was being done when it happened
 */
export function withContext(context: string, error: unknown): Error {
  const reason = error instanceof Error ? error.message : String(error);
  return new Error(`${context}: ${reason}`);
}
