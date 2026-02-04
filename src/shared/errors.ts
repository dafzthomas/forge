/**
 * Error types and codes shared between main and renderer processes
 */

/**
 * Comprehensive error codes for different failure scenarios
 */
export enum ErrorCode {
  // Provider errors
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_AUTH_FAILED = 'PROVIDER_AUTH_FAILED',
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_INVALID_CONFIG = 'PROVIDER_INVALID_CONFIG',
  PROVIDER_REQUEST_FAILED = 'PROVIDER_REQUEST_FAILED',

  // Task errors
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_FAILED = 'TASK_FAILED',
  TASK_CANCELLED = 'TASK_CANCELLED',
  TASK_ALREADY_RUNNING = 'TASK_ALREADY_RUNNING',
  TASK_VALIDATION_FAILED = 'TASK_VALIDATION_FAILED',

  // Git errors
  GIT_NOT_INITIALIZED = 'GIT_NOT_INITIALIZED',
  GIT_OPERATION_FAILED = 'GIT_OPERATION_FAILED',
  GIT_CONFLICT = 'GIT_CONFLICT',
  GIT_REMOTE_ERROR = 'GIT_REMOTE_ERROR',

  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * Custom error class for Forge application errors
 */
export class ForgeError extends Error {
  /**
   * Creates a new ForgeError
   * @param code - Error code identifying the type of error
   * @param message - Human-readable error message
   * @param details - Additional context about the error
   * @param recoverable - Whether the error can be retried or recovered from
   * @param cause - Original error that caused this error (if any)
   */
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
    public recoverable: boolean = false,
    public cause?: Error
  ) {
    super(message)
    this.name = 'ForgeError'

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ForgeError)
    }

    // Include cause in stack trace if available
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
  }

  /**
   * Converts error to JSON for serialization (e.g., over IPC)
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
      stack: this.stack,
    }
  }

  /**
   * Creates a ForgeError from a plain object (e.g., from IPC)
   */
  static fromJSON(obj: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
    recoverable?: boolean
  }): ForgeError {
    return new ForgeError(
      obj.code,
      obj.message,
      obj.details,
      obj.recoverable ?? false
    )
  }
}

/**
 * Helper function to create typed ForgeErrors
 */
export function createError(
  code: ErrorCode,
  message: string,
  options?: {
    details?: Record<string, unknown>
    recoverable?: boolean
    cause?: Error
  }
): ForgeError {
  return new ForgeError(
    code,
    message,
    options?.details,
    options?.recoverable ?? false,
    options?.cause
  )
}

/**
 * Type guard to check if an error is a ForgeError
 */
export function isForgeError(error: unknown): error is ForgeError {
  return error instanceof ForgeError
}

/**
 * Get error code from any error type
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (isForgeError(error)) {
    return error.code
  }
  return ErrorCode.UNKNOWN_ERROR
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (isForgeError(error)) {
    return error.recoverable
  }
  return false
}

/**
 * Serializable error format for IPC communication
 */
export interface SerializedError {
  name: string
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
  recoverable: boolean
  stack?: string
}
