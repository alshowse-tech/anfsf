/**
 * ANFSF structured error type.
 *
 * All routes should throw AppError for known error conditions.
 * The global error handler in index.ts catches and formats them uniformly.
 */

export class AppError extends Error {
  constructor(
    /** Machine-readable error code, e.g. 'VALIDATION_ERROR', 'NOT_FOUND' */
    public readonly code: string,
    /** HTTP status code */
    public readonly status: number,
    message: string,
    /** Optional human-readable details */
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}
