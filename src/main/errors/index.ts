/**
 * Main process error handling exports
 */

export { ErrorHandler, errorHandler } from './handler.js'
export {
  withRetry,
  withFallback,
  CircuitBreaker,
  DEFAULT_RETRY_OPTIONS,
  type RetryOptions,
} from './recovery.js'
export { registerErrorIPC, cleanupErrorIPC, ERROR_IPC_CHANNELS } from './ipc.js'
