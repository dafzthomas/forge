/**
 * Watcher IPC Handlers
 *
 * Handles IPC communication between renderer and main process for file watchers.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { getFileWatcherService } from './service'
import type { CreateWatchRuleInput, UpdateWatchRuleInput, WatchEvent } from './types'

export function registerWatcherIpcHandlers(): void {
  const watcherService = getFileWatcherService()

  // Start watching a project
  ipcMain.handle(IPC_CHANNELS.WATCHER_START, (_event, projectId: unknown) => {
    if (typeof projectId !== 'string' || !projectId) {
      return { success: false, error: 'projectId is required and must be a string' }
    }

    try {
      watcherService.startWatching(projectId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Stop watching a project
  ipcMain.handle(IPC_CHANNELS.WATCHER_STOP, async (_event, projectId: unknown) => {
    if (typeof projectId !== 'string' || !projectId) {
      return { success: false, error: 'projectId is required and must be a string' }
    }

    try {
      await watcherService.stopWatching(projectId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Add a watch rule
  ipcMain.handle(IPC_CHANNELS.WATCHER_ADD_RULE, (_event, input: unknown) => {
    // Validate input
    if (!input || typeof input !== 'object') {
      return { success: false, error: 'Invalid input format' }
    }

    const {
      projectId,
      name,
      pattern,
      events,
      skillName,
      action,
      customCommand,
      enabled,
      debounceMs,
    } = input as Record<string, unknown>

    // Validate required fields
    if (typeof projectId !== 'string' || !projectId) {
      return { success: false, error: 'projectId is required and must be a string' }
    }
    if (typeof name !== 'string' || !name) {
      return { success: false, error: 'name is required and must be a string' }
    }
    if (typeof pattern !== 'string' || !pattern) {
      return { success: false, error: 'pattern is required and must be a string' }
    }
    if (!Array.isArray(events) || events.length === 0) {
      return { success: false, error: 'events is required and must be a non-empty array' }
    }
    if (typeof enabled !== 'boolean') {
      return { success: false, error: 'enabled is required and must be a boolean' }
    }
    if (typeof debounceMs !== 'number' || debounceMs < 0) {
      return { success: false, error: 'debounceMs is required and must be a non-negative number' }
    }

    // Validate optional fields
    if (skillName !== undefined && typeof skillName !== 'string') {
      return { success: false, error: 'skillName must be a string' }
    }
    if (action !== undefined && !['notify', 'skill', 'custom'].includes(action as string)) {
      return { success: false, error: 'action must be notify, skill, or custom' }
    }
    if (customCommand !== undefined && typeof customCommand !== 'string') {
      return { success: false, error: 'customCommand must be a string' }
    }

    try {
      const validatedInput: CreateWatchRuleInput = {
        projectId,
        name,
        pattern,
        events: events as ('add' | 'change' | 'unlink')[],
        skillName: skillName as string | undefined,
        action: action as 'notify' | 'skill' | 'custom' | undefined,
        customCommand: customCommand as string | undefined,
        enabled,
        debounceMs,
      }

      const rule = watcherService.addRule(validatedInput)
      return { success: true, data: rule }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Update a watch rule
  ipcMain.handle(IPC_CHANNELS.WATCHER_UPDATE_RULE, (_event, id: unknown, updates: unknown) => {
    if (typeof id !== 'string' || !id) {
      return { success: false, error: 'id is required and must be a string' }
    }

    if (!updates || typeof updates !== 'object') {
      return { success: false, error: 'Invalid updates format' }
    }

    try {
      const rule = watcherService.updateRule(id, updates as UpdateWatchRuleInput)
      if (!rule) {
        return { success: false, error: 'Rule not found' }
      }
      return { success: true, data: rule }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Remove a watch rule
  ipcMain.handle(IPC_CHANNELS.WATCHER_REMOVE_RULE, (_event, id: unknown) => {
    if (typeof id !== 'string' || !id) {
      return { success: false, error: 'id is required and must be a string' }
    }

    try {
      const removed = watcherService.removeRule(id)
      if (!removed) {
        return { success: false, error: 'Rule not found' }
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // List rules for a project
  ipcMain.handle(IPC_CHANNELS.WATCHER_LIST_RULES, (_event, projectId: unknown) => {
    if (typeof projectId !== 'string' || !projectId) {
      return { success: false, error: 'projectId is required and must be a string' }
    }

    try {
      const rules = watcherService.listRules(projectId)
      return { success: true, data: rules }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Subscribe to watch events
  ipcMain.handle(IPC_CHANNELS.WATCHER_SUBSCRIBE_EVENTS, (event) => {
    const unsubscribe = watcherService.subscribe((watchEvent: WatchEvent) => {
      // Send event to renderer
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('watcher:event', watchEvent)
      })
    })

    // Return unsubscribe function (though IPC doesn't support this directly)
    // The renderer should call WATCHER_UNSUBSCRIBE_EVENTS when done
    return { success: true }
  })

  // Get active watchers
  ipcMain.handle(IPC_CHANNELS.WATCHER_GET_ACTIVE, () => {
    try {
      const active = watcherService.getActiveWatchers()
      return { success: true, data: active }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}
