/**
 * Recovery strategies for handling errors
 */

import { ForgeError, isForgeError, ErrorCode } from '../../shared/errors.js'
import { errorHandler } from './handler.js'

/**
 * Options for retry logic
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number
  /** Initial delay in milliseconds before first retry */
  initialDelayMs: number
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number
  /** Multiplier for exponential backoff */
  backoffMultiplier: number
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  options: RetryOptions
): number {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt)
  return Math.min(delay, options.maxDelayMs)
}

/**
 * Default function to determine if error should be retried
 */
function defaultShouldRetry(error: ForgeError): boolean {
  // Only retry recoverable errors
  if (!error.recoverable) {
    return false
  }

  // Retry these specific error codes
  const retryableCodes = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.PROVIDER_RATE_LIMITED,
    ErrorCode.PROVIDER_UNAVAILABLE,
    ErrorCode.PROVIDER_REQUEST_FAILED,
  ]

  return retryableCodes.includes(error.code)
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @param shouldRetry - Custom function to determine if error should be retried
 * @returns Result of the function if successful
 * @throws Last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
  shouldRetry: (error: ForgeError) => boolean = defaultShouldRetry
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: ForgeError | undefined

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const forgeError = await errorHandler.handle(error, {
        component: 'recovery',
        operation: 'retry',
        metadata: { attempt: attempt + 1, maxAttempts: opts.maxAttempts },
      })

      lastError = forgeError

      // Check if we should retry
      if (!shouldRetry(forgeError)) {
        throw forgeError
      }

      // Don't wait after last attempt
      if (attempt < opts.maxAttempts - 1) {
        const delay = calculateDelay(attempt, opts)
        console.log(
          `Retry attempt ${attempt + 1}/${opts.maxAttempts} failed. Waiting ${delay}ms before retry...`
        )
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  throw lastError
}

/**
 * Default function to determine if should fallback to next provider
 */
function defaultShouldFallback(error: ForgeError): boolean {
  const fallbackCodes = [
    ErrorCode.PROVIDER_NOT_FOUND,
    ErrorCode.PROVIDER_AUTH_FAILED,
    ErrorCode.PROVIDER_UNAVAILABLE,
    ErrorCode.PROVIDER_REQUEST_FAILED,
  ]

  return fallbackCodes.includes(error.code)
}

/**
 * Try primary function, fallback to alternatives if it fails
 * @param primary - Primary function to try
 * @param fallbacks - Array of fallback functions to try in order
 * @param shouldFallback - Custom function to determine if error should trigger fallback
 * @returns Result of first successful function
 * @throws Last error if all functions fail
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallbacks: Array<() => Promise<T>>,
  shouldFallback: (error: ForgeError) => boolean = defaultShouldFallback
): Promise<T> {
  const allFunctions = [primary, ...fallbacks]
  let lastError: ForgeError | undefined

  for (let i = 0; i < allFunctions.length; i++) {
    const fn = allFunctions[i]
    const isPrimary = i === 0

    try {
      const result = await fn()
      if (!isPrimary) {
        console.log(`Fallback ${i} succeeded`)
      }
      return result
    } catch (error) {
      const forgeError = await errorHandler.handle(error, {
        component: 'recovery',
        operation: 'fallback',
        metadata: { index: i, isPrimary },
      })

      lastError = forgeError

      // Check if we should fallback
      if (!shouldFallback(forgeError)) {
        throw forgeError
      }

      if (i < allFunctions.length - 1) {
        console.log(`${isPrimary ? 'Primary' : `Fallback ${i}`} failed, trying next fallback...`)
      }
    }
  }

  // All fallbacks exhausted
  throw lastError
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN',     // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

/**
 * Circuit breaker to prevent repeated failures
 * Useful for preventing cascading failures when a service is down
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private lastFailureTime?: number
  private successCount = 0

  /**
   * Create a circuit breaker
   * @param threshold - Number of failures before opening circuit
   * @param resetTimeMs - Time in ms before attempting to close circuit
   * @param halfOpenSuccessThreshold - Successful calls needed in half-open state to close
   */
  constructor(
    private threshold: number = 5,
    private resetTimeMs: number = 60000,
    private halfOpenSuccessThreshold: number = 2
  ) {}

  /**
   * Execute function with circuit breaker protection
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws Error if circuit is open, or if function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.state = CircuitState.HALF_OPEN
      this.successCount = 0
      console.log('Circuit breaker entering HALF_OPEN state')
    }

    // Reject immediately if circuit is open
    if (this.state === CircuitState.OPEN) {
      const error = new ForgeError(
        ErrorCode.PROVIDER_UNAVAILABLE,
        'Circuit breaker is OPEN - service temporarily unavailable',
        {
          failureCount: this.failureCount,
          lastFailureTime: this.lastFailureTime,
        },
        true
      )
      throw error
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = undefined
    console.log('Circuit breaker manually reset to CLOSED')
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = CircuitState.CLOSED
        this.failureCount = 0
        this.successCount = 0
        console.log('Circuit breaker closed after successful recovery')
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery, go back to OPEN
      this.state = CircuitState.OPEN
      console.log('Circuit breaker reopened after failed recovery attempt')
    } else if (this.state === CircuitState.CLOSED && this.failureCount >= this.threshold) {
      // Too many failures, open the circuit
      this.state = CircuitState.OPEN
      console.log(
        `Circuit breaker opened after ${this.failureCount} failures`
      )
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return false
    }
    return Date.now() - this.lastFailureTime >= this.resetTimeMs
  }
}
