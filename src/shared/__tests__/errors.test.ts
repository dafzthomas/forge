/**
 * Tests for shared error types
 */

import { describe, it, expect } from 'vitest'
import {
  ForgeError,
  ErrorCode,
  createError,
  isForgeError,
  getErrorCode,
  isRecoverableError,
} from '../errors'

describe('ForgeError', () => {
  it('should create error with all properties', () => {
    const error = new ForgeError(
      ErrorCode.PROVIDER_NOT_FOUND,
      'Provider not found',
      { provider: 'test' },
      true
    )

    expect(error.code).toBe(ErrorCode.PROVIDER_NOT_FOUND)
    expect(error.message).toBe('Provider not found')
    expect(error.details).toEqual({ provider: 'test' })
    expect(error.recoverable).toBe(true)
    expect(error.name).toBe('ForgeError')
  })

  it('should include cause in stack trace', () => {
    const cause = new Error('Original error')
    const error = new ForgeError(
      ErrorCode.INTERNAL_ERROR,
      'Wrapped error',
      undefined,
      false,
      cause
    )

    expect(error.cause).toBe(cause)
    if (error.stack) {
      expect(error.stack).toContain('Caused by')
    }
  })

  it('should serialize to JSON', () => {
    const error = new ForgeError(
      ErrorCode.TASK_FAILED,
      'Task execution failed',
      { taskId: '123' },
      true
    )

    const json = error.toJSON()

    expect(json).toEqual({
      name: 'ForgeError',
      code: ErrorCode.TASK_FAILED,
      message: 'Task execution failed',
      details: { taskId: '123' },
      recoverable: true,
      stack: expect.any(String),
    })
  })

  it('should deserialize from JSON', () => {
    const json = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Invalid input',
      details: { field: 'email' },
      recoverable: false,
    }

    const error = ForgeError.fromJSON(json)

    expect(error).toBeInstanceOf(ForgeError)
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(error.message).toBe('Invalid input')
    expect(error.details).toEqual({ field: 'email' })
    expect(error.recoverable).toBe(false)
  })
})

describe('createError', () => {
  it('should create error with minimal options', () => {
    const error = createError(ErrorCode.FILE_NOT_FOUND, 'File missing')

    expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND)
    expect(error.message).toBe('File missing')
    expect(error.recoverable).toBe(false)
  })

  it('should create error with all options', () => {
    const cause = new Error('IO error')
    const error = createError(ErrorCode.FILE_READ_ERROR, 'Cannot read file', {
      details: { path: '/test' },
      recoverable: true,
      cause,
    })

    expect(error.code).toBe(ErrorCode.FILE_READ_ERROR)
    expect(error.message).toBe('Cannot read file')
    expect(error.details).toEqual({ path: '/test' })
    expect(error.recoverable).toBe(true)
    expect(error.cause).toBe(cause)
  })
})

describe('isForgeError', () => {
  it('should return true for ForgeError', () => {
    const error = createError(ErrorCode.UNKNOWN_ERROR, 'Test')
    expect(isForgeError(error)).toBe(true)
  })

  it('should return false for standard Error', () => {
    const error = new Error('Test')
    expect(isForgeError(error)).toBe(false)
  })

  it('should return false for non-errors', () => {
    expect(isForgeError('string')).toBe(false)
    expect(isForgeError(null)).toBe(false)
    expect(isForgeError(undefined)).toBe(false)
    expect(isForgeError(123)).toBe(false)
  })
})

describe('getErrorCode', () => {
  it('should return code from ForgeError', () => {
    const error = createError(ErrorCode.NETWORK_ERROR, 'Network failed')
    expect(getErrorCode(error)).toBe(ErrorCode.NETWORK_ERROR)
  })

  it('should return UNKNOWN_ERROR for standard Error', () => {
    const error = new Error('Test')
    expect(getErrorCode(error)).toBe(ErrorCode.UNKNOWN_ERROR)
  })

  it('should return UNKNOWN_ERROR for non-errors', () => {
    expect(getErrorCode('string')).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(getErrorCode(null)).toBe(ErrorCode.UNKNOWN_ERROR)
  })
})

describe('isRecoverableError', () => {
  it('should return true for recoverable ForgeError', () => {
    const error = createError(ErrorCode.TIMEOUT_ERROR, 'Timeout', {
      recoverable: true,
    })
    expect(isRecoverableError(error)).toBe(true)
  })

  it('should return false for non-recoverable ForgeError', () => {
    const error = createError(ErrorCode.VALIDATION_ERROR, 'Invalid', {
      recoverable: false,
    })
    expect(isRecoverableError(error)).toBe(false)
  })

  it('should return false for standard Error', () => {
    const error = new Error('Test')
    expect(isRecoverableError(error)).toBe(false)
  })

  it('should return false for non-errors', () => {
    expect(isRecoverableError('string')).toBe(false)
    expect(isRecoverableError(null)).toBe(false)
  })
})
