/**
 * Tests for error components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '../components/errors/ErrorBoundary'
import { ErrorDisplay } from '../components/errors/ErrorDisplay'
import { ErrorCode, createError } from '../../shared/errors'

// Mock electron IPC
vi.mock('../lib/ipc', () => ({
  invoke: vi.fn(),
}))

describe('ErrorDisplay', () => {
  it('should render error information', () => {
    const error = createError(
      ErrorCode.TASK_FAILED,
      'Task execution failed',
      { details: { taskId: '123' } }
    )

    render(<ErrorDisplay error={error} />)

    expect(screen.getByText('Task Failed')).toBeInTheDocument()
    expect(screen.getByText('Task execution failed')).toBeInTheDocument()
    expect(screen.getByText('TASK_FAILED')).toBeInTheDocument()
  })

  it('should show retry button for recoverable errors', () => {
    const error = createError(
      ErrorCode.NETWORK_ERROR,
      'Network failed',
      { recoverable: true }
    )
    const onRetry = vi.fn()

    render(<ErrorDisplay error={error} onRetry={onRetry} />)

    expect(screen.getByText('Retry')).toBeInTheDocument()
    expect(
      screen.getByText('This error may be temporary and can be retried')
    ).toBeInTheDocument()
  })

  it('should not show retry button for non-recoverable errors', () => {
    const error = createError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid input',
      { recoverable: false }
    )

    render(<ErrorDisplay error={error} />)

    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
  })

  it('should call onRetry when retry button clicked', async () => {
    const user = userEvent.setup()
    const error = createError(
      ErrorCode.TIMEOUT_ERROR,
      'Timeout',
      { recoverable: true }
    )
    const onRetry = vi.fn()

    render(<ErrorDisplay error={error} onRetry={onRetry} />)

    const retryButton = screen.getByText('Retry')
    await user.click(retryButton)

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('should call onDismiss when dismiss button clicked', async () => {
    const user = userEvent.setup()
    const error = createError(ErrorCode.INTERNAL_ERROR, 'Internal error')
    const onDismiss = vi.fn()

    render(<ErrorDisplay error={error} onDismiss={onDismiss} />)

    const dismissButton = screen.getByText('Dismiss')
    await user.click(dismissButton)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('should show error details when expanded', async () => {
    const user = userEvent.setup()
    const error = createError(
      ErrorCode.PROVIDER_REQUEST_FAILED,
      'Request failed',
      { details: { statusCode: 500, endpoint: '/api/test' } }
    )

    render(<ErrorDisplay error={error} />)

    // Details should not be visible initially
    expect(screen.queryByText('statusCode')).not.toBeInTheDocument()

    // Click to show details
    const detailsButton = screen.getByText('Show details')
    await user.click(detailsButton)

    // Details should now be visible
    expect(screen.getByText(/"statusCode": 500/)).toBeInTheDocument()
  })

  it('should render correct icon for different error types', () => {
    const { rerender } = render(
      <ErrorDisplay
        error={createError(ErrorCode.INTERNAL_ERROR, 'Internal')}
      />
    )
    expect(screen.getByText('⛔')).toBeInTheDocument()

    rerender(
      <ErrorDisplay
        error={createError(ErrorCode.NETWORK_ERROR, 'Network', {
          recoverable: true,
        })}
      />
    )
    expect(screen.getByText('⚠️')).toBeInTheDocument()

    rerender(
      <ErrorDisplay
        error={createError(ErrorCode.VALIDATION_ERROR, 'Validation')}
      />
    )
    expect(screen.getByText('ℹ️')).toBeInTheDocument()
  })
})

describe('ErrorBoundary', () => {
  // Suppress console errors for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = vi.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should catch and display errors', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Internal Error')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('should use custom fallback', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
  })

  it('should use custom fallback function', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    const fallback = (error: Error, reset: () => void) => (
      <div>
        <div>Error: {error.message}</div>
        <button onClick={reset}>Reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error: Test error')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('should call onError callback', () => {
    const onError = vi.fn()
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('should reset and retry rendering', async () => {
    const user = userEvent.setup()
    let shouldThrow = true

    const MaybeThrow = () => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>Success</div>
    }

    render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    )

    // Error should be displayed
    expect(screen.getByText('Test error')).toBeInTheDocument()

    // Fix the error
    shouldThrow = false

    // Click dismiss (which resets the error)
    const dismissButton = screen.getByText('Dismiss')
    await user.click(dismissButton)

    // Should show success now
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('should handle ForgeError', () => {
    const ThrowError = () => {
      throw createError(ErrorCode.TASK_FAILED, 'Task failed', {
        details: { taskId: '123' },
      })
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Task Failed')).toBeInTheDocument()
    expect(screen.getByText('Task failed')).toBeInTheDocument()
    expect(screen.getByText('TASK_FAILED')).toBeInTheDocument()
  })
})
