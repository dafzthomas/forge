/**
 * Centralized error handling for the main process
 */

import {
  ForgeError,
  ErrorCode,
  createError,
  isForgeError,
} from '../../shared/errors.js'

/**
 * Error context information
 */
interface ErrorContext {
  component?: string
  operation?: string
  metadata?: Record<string, unknown>
}

/**
 * Centralized error handler for the application
 */
export class ErrorHandler {
  private listeners: Array<(error: ForgeError, context?: ErrorContext) => void> = []

  /**
   * Handle an error with logging and optional recovery
   * @param error - Error to handle (can be any type)
   * @param context - Additional context about where/why the error occurred
   * @returns Normalized ForgeError
   */
  async handle(error: unknown, context?: ErrorContext): Promise<ForgeError> {
    const forgeError = this.normalize(error)

    // Log the error
    this.log(forgeError, context)

    // Notify all listeners
    this.notifyListeners(forgeError, context)

    return forgeError
  }

  /**
   * Convert unknown errors to ForgeError
   * @param error - Error of unknown type
   * @returns Normalized ForgeError
   */
  normalize(error: unknown): ForgeError {
    // Already a ForgeError
    if (isForgeError(error)) {
      return error
    }

    // Standard Error object
    if (error instanceof Error) {
      return this.normalizeStandardError(error)
    }

    // String error
    if (typeof error === 'string') {
      return createError(ErrorCode.UNKNOWN_ERROR, error)
    }

    // Object with message
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message)
      const details = { originalError: error }
      return createError(ErrorCode.UNKNOWN_ERROR, message, { details })
    }

    // Completely unknown
    return createError(
      ErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred',
      { details: { originalError: error } }
    )
  }

  /**
   * Normalize standard Error objects to ForgeError
   */
  private normalizeStandardError(error: Error): ForgeError {
    // Try to infer error code from error type or message
    const code = this.inferErrorCode(error)

    return createError(code, error.message, {
      cause: error,
      recoverable: this.isLikelyRecoverable(error),
      details: { errorType: error.constructor.name },
    })
  }

  /**
   * Infer error code from standard Error
   */
  private inferErrorCode(error: Error): ErrorCode {
    const message = error.message.toLowerCase()
    const errorName = error.constructor.name.toLowerCase()

    // File system errors
    if (message.includes('enoent') || message.includes('not found')) {
      return ErrorCode.FILE_NOT_FOUND
    }
    if (message.includes('eacces') || message.includes('permission denied')) {
      return ErrorCode.FILE_ACCESS_DENIED
    }

    // Network errors
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      errorName.includes('timeout')
    ) {
      return ErrorCode.TIMEOUT_ERROR
    }
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return ErrorCode.NETWORK_ERROR
    }

    // Provider errors
    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorCode.PROVIDER_RATE_LIMITED
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorCode.PROVIDER_AUTH_FAILED
    }
    if (message.includes('503') || message.includes('unavailable')) {
      return ErrorCode.PROVIDER_UNAVAILABLE
    }

    // Git errors
    if (message.includes('git') || message.includes('not a git repository')) {
      return ErrorCode.GIT_OPERATION_FAILED
    }

    // Database errors
    if (
      errorName.includes('sqlite') ||
      message.includes('database') ||
      message.includes('constraint')
    ) {
      return ErrorCode.DATABASE_ERROR
    }

    return ErrorCode.INTERNAL_ERROR
  }

  /**
   * Determine if an error is likely recoverable
   */
  private isLikelyRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase()

    // Network errors are often recoverable via retry
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    ) {
      return true
    }

    // Rate limiting is recoverable with backoff
    if (message.includes('rate limit') || message.includes('429')) {
      return true
    }

    // Temporary unavailability
    if (message.includes('503') || message.includes('unavailable')) {
      return true
    }

    return false
  }

  /**
   * Register error listeners for telemetry/UI updates
   * @param listener - Function to call when errors occur
   * @returns Unsubscribe function
   */
  onError(
    listener: (error: ForgeError, context?: ErrorContext) => void
  ): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners of an error
   */
  private notifyListeners(error: ForgeError, context?: ErrorContext): void {
    for (const listener of this.listeners) {
      try {
        listener(error, context)
      } catch (listenerError) {
        // Prevent listener errors from breaking error handling
        console.error('Error in error listener:', listenerError)
      }
    }
  }

  /**
   * Log error with context
   */
  private log(error: ForgeError, context?: ErrorContext): void {
    const contextStr = context
      ? ` [${[
          context.component,
          context.operation,
        ].filter(Boolean).join('.')}]`
      : ''

    console.error(
      `${contextStr} ${error.code}: ${error.message}`,
      error.details || '',
      error.cause ? `\nCaused by: ${error.cause}` : ''
    )

    // Log full stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.error(error.stack)
    }
  }

  /**
   * Clear all error listeners (useful for testing)
   */
  clearListeners(): void {
    this.listeners = []
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler()
