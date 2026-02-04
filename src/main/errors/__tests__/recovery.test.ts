/**
 * Tests for recovery strategies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  withRetry,
  withFallback,
  CircuitBreaker,
  DEFAULT_RETRY_OPTIONS,
} from '../recovery'
import { ErrorCode, createError } from '../../../shared/errors'

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on recoverable errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        createError(ErrorCode.NETWORK_ERROR, 'Network failed', {
          recoverable: true,
        })
      )
      .mockResolvedValueOnce('success')

    const result = await withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not retry on non-recoverable errors', async () => {
    const error = createError(ErrorCode.VALIDATION_ERROR, 'Invalid input', {
      recoverable: false,
    })
    const fn = vi.fn().mockRejectedValue(error)

    await expect(withRetry(fn)).rejects.toThrow(error)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should throw last error after max attempts', async () => {
    const error = createError(ErrorCode.TIMEOUT_ERROR, 'Timeout', {
      recoverable: true,
    })
    const fn = vi.fn().mockRejectedValue(error)

    await expect(
      withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })
    ).rejects.toThrow(error)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should apply exponential backoff', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        createError(ErrorCode.PROVIDER_RATE_LIMITED, 'Rate limited', {
          recoverable: true,
        })
      )
      .mockRejectedValueOnce(
        createError(ErrorCode.PROVIDER_RATE_LIMITED, 'Rate limited', {
          recoverable: true,
        })
      )
      .mockResolvedValueOnce('success')

    const startTime = Date.now()
    const result = await withRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    })
    const elapsed = Date.now() - startTime

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
    // Should wait at least initialDelayMs (100) + initialDelayMs * 2 (200) = 300ms
    expect(elapsed).toBeGreaterThanOrEqual(300)
  })

  it('should respect maxDelayMs', async () => {
    const fn = vi.fn().mockRejectedValue(
      createError(ErrorCode.NETWORK_ERROR, 'Network error', {
        recoverable: true,
      })
    )

    const startTime = Date.now()
    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 50,
        backoffMultiplier: 10,
      })
    ).rejects.toThrow()
    const elapsed = Date.now() - startTime

    // Total delay should be maxDelayMs * 2 (for 2 retries)
    expect(elapsed).toBeLessThan(200) // Some buffer for test execution
  })

  it('should use custom shouldRetry function', async () => {
    const error = createError(ErrorCode.TASK_FAILED, 'Task failed', {
      recoverable: true,
    })
    const fn = vi.fn().mockRejectedValue(error)
    const shouldRetry = vi.fn().mockReturnValue(false)

    await expect(withRetry(fn, undefined, shouldRetry)).rejects.toThrow(error)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledWith(error)
  })
})

describe('withFallback', () => {
  it('should return primary result on success', async () => {
    const primary = vi.fn().mockResolvedValue('primary')
    const fallback1 = vi.fn().mockResolvedValue('fallback1')
    const fallback2 = vi.fn().mockResolvedValue('fallback2')

    const result = await withFallback(primary, [fallback1, fallback2])

    expect(result).toBe('primary')
    expect(primary).toHaveBeenCalledTimes(1)
    expect(fallback1).not.toHaveBeenCalled()
    expect(fallback2).not.toHaveBeenCalled()
  })

  it('should try fallbacks on primary failure', async () => {
    const primary = vi
      .fn()
      .mockRejectedValue(
        createError(ErrorCode.PROVIDER_UNAVAILABLE, 'Unavailable')
      )
    const fallback1 = vi.fn().mockResolvedValue('fallback1')
    const fallback2 = vi.fn().mockResolvedValue('fallback2')

    const result = await withFallback(primary, [fallback1, fallback2])

    expect(result).toBe('fallback1')
    expect(primary).toHaveBeenCalledTimes(1)
    expect(fallback1).toHaveBeenCalledTimes(1)
    expect(fallback2).not.toHaveBeenCalled()
  })

  it('should try all fallbacks until success', async () => {
    const primary = vi
      .fn()
      .mockRejectedValue(
        createError(ErrorCode.PROVIDER_UNAVAILABLE, 'Unavailable')
      )
    const fallback1 = vi
      .fn()
      .mockRejectedValue(
        createError(ErrorCode.PROVIDER_UNAVAILABLE, 'Unavailable')
      )
    const fallback2 = vi.fn().mockResolvedValue('fallback2')

    const result = await withFallback(primary, [fallback1, fallback2])

    expect(result).toBe('fallback2')
    expect(primary).toHaveBeenCalledTimes(1)
    expect(fallback1).toHaveBeenCalledTimes(1)
    expect(fallback2).toHaveBeenCalledTimes(1)
  })

  it('should throw last error if all fail', async () => {
    const error = createError(ErrorCode.PROVIDER_UNAVAILABLE, 'Unavailable')
    const primary = vi.fn().mockRejectedValue(error)
    const fallback1 = vi.fn().mockRejectedValue(error)
    const fallback2 = vi.fn().mockRejectedValue(error)

    await expect(
      withFallback(primary, [fallback1, fallback2])
    ).rejects.toThrow(error)
    expect(primary).toHaveBeenCalledTimes(1)
    expect(fallback1).toHaveBeenCalledTimes(1)
    expect(fallback2).toHaveBeenCalledTimes(1)
  })

  it('should not fallback on non-fallback errors', async () => {
    const error = createError(ErrorCode.VALIDATION_ERROR, 'Invalid input')
    const primary = vi.fn().mockRejectedValue(error)
    const fallback1 = vi.fn().mockResolvedValue('fallback1')

    await expect(withFallback(primary, [fallback1])).rejects.toThrow(error)
    expect(primary).toHaveBeenCalledTimes(1)
    expect(fallback1).not.toHaveBeenCalled()
  })

  it('should use custom shouldFallback function', async () => {
    const error = createError(ErrorCode.TASK_FAILED, 'Task failed')
    const primary = vi.fn().mockRejectedValue(error)
    const fallback1 = vi.fn().mockResolvedValue('fallback1')
    const shouldFallback = vi.fn().mockReturnValue(true)

    const result = await withFallback(primary, [fallback1], shouldFallback)

    expect(result).toBe('fallback1')
    expect(shouldFallback).toHaveBeenCalledWith(error)
  })
})

describe('CircuitBreaker', () => {
  it('should execute function when closed', async () => {
    const breaker = new CircuitBreaker(3, 1000)
    const fn = vi.fn().mockResolvedValue('success')

    const result = await breaker.execute(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(breaker.isOpen()).toBe(false)
  })

  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker(3, 1000)
    const fn = vi.fn().mockRejectedValue(new Error('Failed'))

    // Fail threshold times
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('Failed')
    }

    expect(breaker.isOpen()).toBe(true)
    expect(breaker.getState()).toBe('OPEN')
  })

  it('should reject immediately when open', async () => {
    const breaker = new CircuitBreaker(2, 1000)
    const fn = vi.fn().mockRejectedValue(new Error('Failed'))

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow()
    await expect(breaker.execute(fn)).rejects.toThrow()

    expect(breaker.isOpen()).toBe(true)

    // Should reject without calling function
    await expect(breaker.execute(fn)).rejects.toThrow(
      'Circuit breaker is OPEN'
    )
    expect(fn).toHaveBeenCalledTimes(2) // Not called the third time
  })

  it('should transition to half-open after reset time', async () => {
    const breaker = new CircuitBreaker(2, 100) // 100ms reset time
    const fn = vi.fn().mockRejectedValue(new Error('Failed'))

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow()
    await expect(breaker.execute(fn)).rejects.toThrow()
    expect(breaker.getState()).toBe('OPEN')

    // Wait for reset time
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Should now be in half-open state and try the function
    fn.mockResolvedValueOnce('success')
    const result = await breaker.execute(fn)

    expect(result).toBe('success')
    expect(breaker.getState()).toBe('HALF_OPEN')
  })

  it('should close after successful recovery', async () => {
    const breaker = new CircuitBreaker(2, 100, 2) // Need 2 successes
    const fn = vi.fn()

    // Open the circuit
    fn.mockRejectedValue(new Error('Failed'))
    await expect(breaker.execute(fn)).rejects.toThrow()
    await expect(breaker.execute(fn)).rejects.toThrow()

    // Wait for reset time
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Two successful calls should close the circuit
    fn.mockResolvedValue('success')
    await breaker.execute(fn)
    expect(breaker.getState()).toBe('HALF_OPEN')

    await breaker.execute(fn)
    expect(breaker.getState()).toBe('CLOSED')
    expect(breaker.isOpen()).toBe(false)
  })

  it('should reopen on failure in half-open state', async () => {
    const breaker = new CircuitBreaker(2, 100)
    const fn = vi.fn()

    // Open the circuit
    fn.mockRejectedValue(new Error('Failed'))
    await expect(breaker.execute(fn)).rejects.toThrow()
    await expect(breaker.execute(fn)).rejects.toThrow()

    // Wait for reset time
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Fail in half-open state
    await expect(breaker.execute(fn)).rejects.toThrow()
    expect(breaker.getState()).toBe('OPEN')
  })

  it('should reset manually', async () => {
    const breaker = new CircuitBreaker(2, 1000)
    const fn = vi.fn().mockRejectedValue(new Error('Failed'))

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow()
    await expect(breaker.execute(fn)).rejects.toThrow()
    expect(breaker.isOpen()).toBe(true)

    // Manual reset
    breaker.reset()

    expect(breaker.isOpen()).toBe(false)
    expect(breaker.getState()).toBe('CLOSED')

    // Should work now
    fn.mockResolvedValue('success')
    const result = await breaker.execute(fn)
    expect(result).toBe('success')
  })

  it('should reset failure count on success in closed state', async () => {
    const breaker = new CircuitBreaker(3, 1000)
    const fn = vi.fn()

    // Some failures, but not enough to open
    fn.mockRejectedValue(new Error('Failed'))
    await expect(breaker.execute(fn)).rejects.toThrow()
    await expect(breaker.execute(fn)).rejects.toThrow()

    // Success should reset counter
    fn.mockResolvedValue('success')
    await breaker.execute(fn)

    // Two more failures shouldn't open (would need 3)
    fn.mockRejectedValue(new Error('Failed'))
    await expect(breaker.execute(fn)).rejects.toThrow()
    await expect(breaker.execute(fn)).rejects.toThrow()

    expect(breaker.isOpen()).toBe(false)
  })
})
