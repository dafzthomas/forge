/**
 * Error display component for showing ForgeErrors to users
 */

import React from 'react'
import { ForgeError, ErrorCode } from '../../../shared/errors'

interface ErrorDisplayProps {
  /** Error to display */
  error: ForgeError
  /** Optional retry handler */
  onRetry?: () => void
  /** Optional dismiss handler */
  onDismiss?: () => void
}

/**
 * Get user-friendly error title based on error code
 */
function getErrorTitle(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.PROVIDER_NOT_FOUND:
      return 'Provider Not Found'
    case ErrorCode.PROVIDER_AUTH_FAILED:
      return 'Authentication Failed'
    case ErrorCode.PROVIDER_RATE_LIMITED:
      return 'Rate Limit Exceeded'
    case ErrorCode.PROVIDER_UNAVAILABLE:
      return 'Service Unavailable'
    case ErrorCode.PROVIDER_INVALID_CONFIG:
      return 'Invalid Configuration'
    case ErrorCode.PROVIDER_REQUEST_FAILED:
      return 'Request Failed'

    case ErrorCode.TASK_NOT_FOUND:
      return 'Task Not Found'
    case ErrorCode.TASK_FAILED:
      return 'Task Failed'
    case ErrorCode.TASK_CANCELLED:
      return 'Task Cancelled'
    case ErrorCode.TASK_ALREADY_RUNNING:
      return 'Task Already Running'
    case ErrorCode.TASK_VALIDATION_FAILED:
      return 'Validation Failed'

    case ErrorCode.GIT_NOT_INITIALIZED:
      return 'Git Not Initialized'
    case ErrorCode.GIT_OPERATION_FAILED:
      return 'Git Operation Failed'
    case ErrorCode.GIT_CONFLICT:
      return 'Git Conflict'
    case ErrorCode.GIT_REMOTE_ERROR:
      return 'Git Remote Error'

    case ErrorCode.FILE_NOT_FOUND:
      return 'File Not Found'
    case ErrorCode.FILE_ACCESS_DENIED:
      return 'Access Denied'
    case ErrorCode.FILE_READ_ERROR:
      return 'File Read Error'
    case ErrorCode.FILE_WRITE_ERROR:
      return 'File Write Error'

    case ErrorCode.DATABASE_ERROR:
      return 'Database Error'
    case ErrorCode.DATABASE_CONSTRAINT_ERROR:
      return 'Database Constraint Error'

    case ErrorCode.VALIDATION_ERROR:
      return 'Validation Error'
    case ErrorCode.NETWORK_ERROR:
      return 'Network Error'
    case ErrorCode.TIMEOUT_ERROR:
      return 'Request Timeout'
    case ErrorCode.INTERNAL_ERROR:
      return 'Internal Error'
    case ErrorCode.UNKNOWN_ERROR:
    default:
      return 'Error'
  }
}

/**
 * Get icon for error severity/type
 */
function getErrorIcon(code: ErrorCode): string {
  // Critical errors
  if (
    [
      ErrorCode.INTERNAL_ERROR,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.FILE_ACCESS_DENIED,
    ].includes(code)
  ) {
    return '⛔'
  }

  // Temporary/recoverable errors
  if (
    [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.PROVIDER_RATE_LIMITED,
      ErrorCode.PROVIDER_UNAVAILABLE,
    ].includes(code)
  ) {
    return '⚠️'
  }

  // Informational errors
  if (
    [
      ErrorCode.TASK_CANCELLED,
      ErrorCode.VALIDATION_ERROR,
    ].includes(code)
  ) {
    return 'ℹ️'
  }

  return '❌'
}

/**
 * Component that displays error information with actions
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
}: ErrorDisplayProps): JSX.Element {
  const title = getErrorTitle(error.code)
  const icon = getErrorIcon(error.code)
  const showRetry = error.recoverable && onRetry

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-900 overflow-hidden">
      {/* Header */}
      <div className="bg-red-50 dark:bg-red-950 px-6 py-4 border-b border-red-200 dark:border-red-900">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="error">
            {icon}
          </span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              {title}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 font-mono">
              {error.code}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        <p className="text-gray-900 dark:text-gray-100 mb-4">
          {error.message}
        </p>

        {/* Error details */}
        {error.details && Object.keys(error.details).length > 0 && (
          <details className="mb-4">
            <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">
              Show details
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          </details>
        )}

        {/* Stack trace in development */}
        {process.env.NODE_ENV === 'development' && error.stack && (
          <details className="mb-4">
            <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">
              Show stack trace
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
              {error.stack}
            </pre>
          </details>
        )}

        {/* Recoverable indicator */}
        {error.recoverable && (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 mb-4">
            <span>🔄</span>
            <span>This error may be temporary and can be retried</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {(showRetry || onDismiss) && (
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Dismiss
            </button>
          )}
          {showRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}
