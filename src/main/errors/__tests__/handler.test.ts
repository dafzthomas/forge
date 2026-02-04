/**
 * Tests for error handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorHandler } from '../handler'
import { ForgeError, ErrorCode, createError } from '../../../shared/errors'

describe('ErrorHandler', () => {
  let handler: ErrorHandler

  beforeEach(() => {
    handler = new ErrorHandler()
    vi.clearAllMocks()
  })

  describe('normalize', () => {
    it('should return ForgeError unchanged', () => {
      const original = createError(ErrorCode.TASK_FAILED, 'Task failed')
      const normalized = handler.normalize(original)

      expect(normalized).toBe(original)
    })

    it('should normalize string errors', () => {
      const normalized = handler.normalize('Something went wrong')

      expect(normalized).toBeInstanceOf(ForgeError)
      expect(normalized.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(normalized.message).toBe('Something went wrong')
    })

    it('should normalize Error objects', () => {
      const error = new Error('Standard error')
      const normalized = handler.normalize(error)

      expect(normalized).toBeInstanceOf(ForgeError)
      expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR)
      expect(normalized.message).toBe('Standard error')
      expect(normalized.cause).toBe(error)
    })

    it('should infer FILE_NOT_FOUND from ENOENT', () => {
      const error = new Error('ENOENT: no such file or directory')
      const normalized = handler.normalize(error)

      expect(normalized.code).toBe(ErrorCode.FILE_NOT_FOUND)
    })

    it('should infer FILE_ACCESS_DENIED from EACCES', () => {
      const error = new Error('EACCES: permission denied')
      const normalized = handler.normalize(error)

      expect(normalized.code).toBe(ErrorCode.FILE_ACCESS_DENIED)
    })

    it('should infer TIMEOUT_ERROR from timeout messages', () => {
      const error = new Error('Request timeout')
      const normalized = handler.normalize(error)

      expect(normalized.code).toBe(ErrorCode.TIMEOUT_ERROR)
      expect(normalized.recoverable).toBe(true)
    })

    it('should infer NETWORK_ERROR from network messages', () => {
      const error = new Error('Network connection failed')
      const normalized = handler.normalize(error)

      expect(normalized.code).toBe(ErrorCode.NETWORK_ERROR)
      expect(normalized.recoverable).toBe(true)
    })

    it('should infer PROVIDER_RATE_LIMITED from 429 status', () => {
      const error = new Error('429 Too Many Requests')
      const normalized = handler.normalize(error)

      expect(normalized.code).toBe(ErrorCode.PROVIDER_RATE_LIMITED)
      expect(normalized.recoverable).toBe(true)
    })

    it('should infer PROVIDER_AUTH_FAILED from 401 status', () => {
      const error = new Error('401 Unauthorized')
      const normalized = handler.normalize(error)

      expect(normalized.code).toBe(ErrorCode.PROVIDER_AUTH_FAILED)
    })

    it('should normalize objects with message property', () => {
      const error = { message: 'Custom error' }
      const normalized = handler.normalize(error)

      expect(normalized).toBeInstanceOf(ForgeError)
      expect(normalized.message).toBe('Custom error')
    })

    it('should handle completely unknown errors', () => {
      const normalized = handler.normalize(null)

      expect(normalized).toBeInstanceOf(ForgeError)
      expect(normalized.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(normalized.message).toBe('An unknown error occurred')
    })
  })

  describe('handle', () => {
    it('should normalize and return ForgeError', async () => {
      const error = new Error('Test error')
      const result = await handler.handle(error)

      expect(result).toBeInstanceOf(ForgeError)
      expect(result.message).toBe('Test error')
    })

    it('should notify listeners', async () => {
      const listener = vi.fn()
      handler.onError(listener)

      const error = createError(ErrorCode.TASK_FAILED, 'Failed')
      await handler.handle(error, { component: 'test', operation: 'run' })

      expect(listener).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          component: 'test',
          operation: 'run',
        })
      )
    })

    it('should handle listener errors gracefully', async () => {
      const badListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      handler.onError(badListener)

      // Should not throw
      await expect(
        handler.handle(createError(ErrorCode.INTERNAL_ERROR, 'Test'))
      ).resolves.toBeDefined()
    })
  })

  describe('onError', () => {
    it('should register error listener', async () => {
      const listener = vi.fn()
      handler.onError(listener)

      const error = createError(ErrorCode.NETWORK_ERROR, 'Network failed')
      await handler.handle(error)

      expect(listener).toHaveBeenCalledWith(error, undefined)
    })

    it('should return unsubscribe function', async () => {
      const listener = vi.fn()
      const unsubscribe = handler.onError(listener)

      // Should receive event
      await handler.handle(createError(ErrorCode.TASK_FAILED, 'Failed'))
      expect(listener).toHaveBeenCalledTimes(1)

      // Unsubscribe
      unsubscribe()

      // Should not receive event
      await handler.handle(createError(ErrorCode.TASK_FAILED, 'Failed again'))
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should support multiple listeners', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      handler.onError(listener1)
      handler.onError(listener2)

      const error = createError(ErrorCode.VALIDATION_ERROR, 'Invalid')
      await handler.handle(error)

      expect(listener1).toHaveBeenCalledWith(error, undefined)
      expect(listener2).toHaveBeenCalledWith(error, undefined)
    })
  })

  describe('clearListeners', () => {
    it('should remove all listeners', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      handler.onError(listener1)
      handler.onError(listener2)

      handler.clearListeners()

      await handler.handle(createError(ErrorCode.INTERNAL_ERROR, 'Test'))

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })
  })
})
