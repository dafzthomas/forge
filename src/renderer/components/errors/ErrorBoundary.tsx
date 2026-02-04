/**
 * React Error Boundary component to catch and handle rendering errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ForgeError, ErrorCode, createError } from '../../../shared/errors'
import { ErrorDisplay } from './ErrorDisplay'

interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Optional custom fallback UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  /** Optional error handler callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component that catches React rendering errors
 * and displays a fallback UI
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Log error information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report error to main process for centralized logging
    this.reportErrorToMain(error, errorInfo)
  }

  /**
   * Report error to main process via IPC
   */
  private async reportErrorToMain(
    error: Error,
    errorInfo: ErrorInfo
  ): Promise<void> {
    try {
      // Convert to ForgeError if not already
      const forgeError =
        error instanceof ForgeError
          ? error
          : createError(ErrorCode.INTERNAL_ERROR, error.message, {
              cause: error,
              details: {
                componentStack: errorInfo.componentStack,
              },
            })

      // Send to main process
      await window.electron.ipcRenderer.invoke(
        'error:report',
        forgeError.toJSON()
      )
    } catch (reportError) {
      // Failed to report error, but don't let this break the error boundary
      console.error('Failed to report error to main process:', reportError)
    }
  }

  /**
   * Reset error state to retry rendering
   */
  private resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetError)
        }
        return this.props.fallback
      }

      // Convert to ForgeError for consistent display
      const forgeError =
        this.state.error instanceof ForgeError
          ? this.state.error
          : createError(
              ErrorCode.INTERNAL_ERROR,
              this.state.error.message || 'An unexpected error occurred',
              { cause: this.state.error }
            )

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-lg w-full">
            <ErrorDisplay
              error={forgeError}
              onRetry={this.resetError}
              onDismiss={this.resetError}
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
