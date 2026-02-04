# Error Handling & Recovery

Centralized error handling system for the Forge application.

## Overview

The error handling system provides:

- **Typed error codes** for different failure scenarios
- **Centralized error handling** with automatic normalization
- **Recovery strategies** including retry, fallback, and circuit breaker
- **IPC error reporting** between main and renderer processes
- **React error boundaries** for UI error handling

## Usage

### Basic Error Handling

```typescript
import { createError, ErrorCode } from '../shared/errors'
import { errorHandler } from './errors/handler'

// Create a typed error
const error = createError(
  ErrorCode.PROVIDER_NOT_FOUND,
  'Provider "openai" not found',
  {
    details: { provider: 'openai' },
    recoverable: false,
  }
)

// Handle an error (normalizes and logs)
await errorHandler.handle(error, {
  component: 'providers',
  operation: 'getProvider',
})
```

### Retry with Exponential Backoff

```typescript
import { withRetry } from './errors/recovery'

// Automatically retry on recoverable errors
const result = await withRetry(
  async () => {
    return await provider.makeRequest()
  },
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  }
)
```

### Fallback to Alternative Providers

```typescript
import { withFallback } from './errors/recovery'

// Try primary provider, fallback to alternatives
const result = await withFallback(
  async () => await primaryProvider.complete(prompt),
  [
    async () => await fallbackProvider1.complete(prompt),
    async () => await fallbackProvider2.complete(prompt),
  ]
)
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from './errors/recovery'

const breaker = new CircuitBreaker(
  5,      // Threshold: open after 5 failures
  60000   // Reset time: try again after 60 seconds
)

// Execute with circuit breaker protection
try {
  const result = await breaker.execute(async () => {
    return await unreliableService.call()
  })
} catch (error) {
  if (breaker.isOpen()) {
    // Circuit is open, use fallback
    return fallbackResult
  }
  throw error
}
```

### Error Listeners

```typescript
import { errorHandler } from './errors/handler'

// Listen for errors (useful for telemetry)
const unsubscribe = errorHandler.onError((error, context) => {
  console.log(`Error in ${context?.component}: ${error.message}`)

  // Send to telemetry service
  telemetry.trackError({
    code: error.code,
    message: error.message,
    component: context?.component,
  })
})

// Unsubscribe when done
unsubscribe()
```

## React Components

### Error Boundary

Wrap components to catch rendering errors:

```tsx
import { ErrorBoundary } from './components/errors'

function App() {
  return (
    <ErrorBoundary onError={(error, info) => console.error(error)}>
      <YourApp />
    </ErrorBoundary>
  )
}
```

### Error Display

Display errors with retry/dismiss actions:

```tsx
import { ErrorDisplay } from './components/errors'
import { createError, ErrorCode } from '../shared/errors'

function Component() {
  const [error, setError] = useState<ForgeError | null>(null)

  return error ? (
    <ErrorDisplay
      error={error}
      onRetry={() => {
        setError(null)
        retryOperation()
      }}
      onDismiss={() => setError(null)}
    />
  ) : (
    <NormalContent />
  )
}
```

## Error Codes

Available error codes:

### Provider Errors
- `PROVIDER_NOT_FOUND` - Provider not found in registry
- `PROVIDER_AUTH_FAILED` - Authentication failed (401)
- `PROVIDER_RATE_LIMITED` - Rate limit exceeded (429)
- `PROVIDER_UNAVAILABLE` - Service unavailable (503)
- `PROVIDER_INVALID_CONFIG` - Invalid provider configuration
- `PROVIDER_REQUEST_FAILED` - Request failed

### Task Errors
- `TASK_NOT_FOUND` - Task not found
- `TASK_FAILED` - Task execution failed
- `TASK_CANCELLED` - Task cancelled by user
- `TASK_ALREADY_RUNNING` - Task already running
- `TASK_VALIDATION_FAILED` - Task validation failed

### Git Errors
- `GIT_NOT_INITIALIZED` - Not a git repository
- `GIT_OPERATION_FAILED` - Git operation failed
- `GIT_CONFLICT` - Merge conflict
- `GIT_REMOTE_ERROR` - Remote operation failed

### File Errors
- `FILE_NOT_FOUND` - File not found (ENOENT)
- `FILE_ACCESS_DENIED` - Permission denied (EACCES)
- `FILE_READ_ERROR` - Failed to read file
- `FILE_WRITE_ERROR` - Failed to write file

### General Errors
- `DATABASE_ERROR` - Database operation failed
- `VALIDATION_ERROR` - Input validation failed
- `NETWORK_ERROR` - Network error
- `TIMEOUT_ERROR` - Request timeout
- `INTERNAL_ERROR` - Internal application error
- `UNKNOWN_ERROR` - Unknown error

## IPC Integration

### Main Process

Register error IPC handlers:

```typescript
import { registerErrorIPC } from './errors/ipc'

// In main process initialization
registerErrorIPC()
```

### Renderer Process

Subscribe to errors and report errors:

```typescript
// Subscribe to error notifications
await window.electron.ipcRenderer.invoke('error:subscribe')

// Listen for errors
window.electron.ipcRenderer.on('error:notification', (event, { error, context }) => {
  console.error('Error from main:', error)
})

// Report error from renderer
await window.electron.ipcRenderer.invoke('error:report', error.toJSON())

// Unsubscribe
await window.electron.ipcRenderer.invoke('error:unsubscribe')
```

## Best Practices

1. **Use typed errors**: Always use `ErrorCode` enum for consistency
2. **Mark recoverable errors**: Set `recoverable: true` for transient failures
3. **Provide context**: Include relevant details in error objects
4. **Handle errors early**: Use error handlers at integration boundaries
5. **Don't swallow errors**: Always log or propagate errors
6. **Use circuit breakers**: Prevent cascading failures in distributed systems
7. **Test error paths**: Write tests for error scenarios
