/**
 * IPC error reporting between main and renderer processes
 */

import { ipcMain } from 'electron'
import { errorHandler } from './handler.js'
import { ForgeError, SerializedError } from '../../shared/errors.js'

/**
 * IPC channels for error reporting
 */
export const ERROR_IPC_CHANNELS = {
  REPORT: 'error:report',
  SUBSCRIBE: 'error:subscribe',
  UNSUBSCRIBE: 'error:unsubscribe',
} as const

/**
 * Map of subscribed windows to their subscription IDs
 */
const subscriptions = new Map<number, () => void>()

/**
 * Register IPC handlers for error reporting
 */
export function registerErrorIPC(): void {
  // Handle error reports from renderer
  ipcMain.handle(
    ERROR_IPC_CHANNELS.REPORT,
    async (_event, serializedError: SerializedError) => {
      // Reconstruct the error
      const error = ForgeError.fromJSON(serializedError)

      // Handle through main process error handler
      await errorHandler.handle(error, {
        component: 'renderer',
        operation: 'report',
      })

      return { success: true }
    }
  )

  // Subscribe to error events
  ipcMain.handle(ERROR_IPC_CHANNELS.SUBSCRIBE, (event) => {
    const webContentsId = event.sender.id

    // Unsubscribe if already subscribed
    if (subscriptions.has(webContentsId)) {
      const unsubscribe = subscriptions.get(webContentsId)
      unsubscribe?.()
    }

    // Create error listener
    const unsubscribe = errorHandler.onError((error, context) => {
      // Send error to renderer
      try {
        event.sender.send('error:notification', {
          error: error.toJSON(),
          context,
        })
      } catch (sendError) {
        // Renderer might be destroyed, clean up subscription
        console.error('Failed to send error to renderer:', sendError)
        subscriptions.delete(webContentsId)
      }
    })

    // Store subscription
    subscriptions.set(webContentsId, unsubscribe)

    // Clean up when renderer is destroyed
    event.sender.on('destroyed', () => {
      const existingUnsubscribe = subscriptions.get(webContentsId)
      if (existingUnsubscribe) {
        existingUnsubscribe()
        subscriptions.delete(webContentsId)
      }
    })

    return { success: true }
  })

  // Unsubscribe from error events
  ipcMain.handle(ERROR_IPC_CHANNELS.UNSUBSCRIBE, (event) => {
    const webContentsId = event.sender.id
    const unsubscribe = subscriptions.get(webContentsId)

    if (unsubscribe) {
      unsubscribe()
      subscriptions.delete(webContentsId)
    }

    return { success: true }
  })
}

/**
 * Clean up all error subscriptions (useful for testing)
 */
export function cleanupErrorIPC(): void {
  // Unsubscribe all listeners
  for (const unsubscribe of subscriptions.values()) {
    unsubscribe()
  }
  subscriptions.clear()

  // Remove IPC handlers
  ipcMain.removeHandler(ERROR_IPC_CHANNELS.REPORT)
  ipcMain.removeHandler(ERROR_IPC_CHANNELS.SUBSCRIBE)
  ipcMain.removeHandler(ERROR_IPC_CHANNELS.UNSUBSCRIBE)
}
