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
  const subscriptions = new Map<number, () => void>()

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
  ipcMain.handle(IPC_CHANNELS.WATCHER_ADD_RULE, async (_event, input: unknown) => {
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
    // Validate pattern doesn't contain path traversal
    const hasPathTraversal = pattern.includes('..') || pattern.startsWith('/')
    if (hasPathTraversal) {
      return { success: false, error: 'pattern cannot contain path traversal (..) or absolute paths' }
    }
    if (!Array.isArray(events) || events.length === 0) {
      return { success: false, error: 'events is required and must be a non-empty array' }
    }
    // Validate events array contents
    const validEvents = ['add', 'change', 'unlink']
    if (!events.every((e: unknown) => typeof e === 'string' && validEvents.includes(e))) {
      return { success: false, error: 'events must only contain: add, change, unlink' }
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

      const rule = await watcherService.addRule(validatedInput)
      return { success: true, data: rule }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Update a watch rule
  ipcMain.handle(IPC_CHANNELS.WATCHER_UPDATE_RULE, async (_event, id: unknown, updates: unknown) => {
    if (typeof id !== 'string' || !id) {
      return { success: false, error: 'id is required and must be a string' }
    }

    if (!updates || typeof updates !== 'object') {
      return { success: false, error: 'Invalid updates format' }
    }

    const updateObj = updates as Record<string, unknown>

    // Validate pattern if provided
    if (updateObj.pattern !== undefined) {
      if (typeof updateObj.pattern !== 'string' || !updateObj.pattern) {
        return { success: false, error: 'pattern must be a non-empty string' }
      }
      if (updateObj.pattern.includes('..') || updateObj.pattern.startsWith('/')) {
        return { success: false, error: 'pattern cannot contain path traversal (..) or absolute paths' }
      }
    }

    // Validate events if provided
    if (updateObj.events !== undefined) {
      if (!Array.isArray(updateObj.events) || updateObj.events.length === 0) {
        return { success: false, error: 'events must be a non-empty array' }
      }
      const validEvents = ['add', 'change', 'unlink']
      if (!updateObj.events.every((e: unknown) => typeof e === 'string' && validEvents.includes(e))) {
        return { success: false, error: 'events must only contain: add, change, unlink' }
      }
    }

    // Validate optional fields
    if (updateObj.name !== undefined && (typeof updateObj.name !== 'string' || !updateObj.name)) {
      return { success: false, error: 'name must be a non-empty string' }
    }
    if (updateObj.skillName !== undefined && typeof updateObj.skillName !== 'string') {
      return { success: false, error: 'skillName must be a string' }
    }
    if (updateObj.action !== undefined && !['notify', 'skill', 'custom'].includes(updateObj.action as string)) {
      return { success: false, error: 'action must be notify, skill, or custom' }
    }
    if (updateObj.customCommand !== undefined && typeof updateObj.customCommand !== 'string') {
      return { success: false, error: 'customCommand must be a string' }
    }
    if (updateObj.enabled !== undefined && typeof updateObj.enabled !== 'boolean') {
      return { success: false, error: 'enabled must be a boolean' }
    }
    if (updateObj.debounceMs !== undefined && (typeof updateObj.debounceMs !== 'number' || updateObj.debounceMs < 0)) {
      return { success: false, error: 'debounceMs must be a non-negative number' }
    }

    try {
      const rule = await watcherService.updateRule(id, updates as UpdateWatchRuleInput)
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
  ipcMain.handle(IPC_CHANNELS.WATCHER_REMOVE_RULE, async (_event, id: unknown) => {
    if (typeof id !== 'string' || !id) {
      return { success: false, error: 'id is required and must be a string' }
    }

    try {
      const removed = await watcherService.removeRule(id)
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
    const webContentsId = event.sender.id

    // Clean up existing subscription if any
    const existingUnsubscribe = subscriptions.get(webContentsId)
    if (existingUnsubscribe) {
      existingUnsubscribe()
    }

    const unsubscribe = watcherService.subscribe((watchEvent: WatchEvent) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('watcher:event', watchEvent)
      }
    })

    subscriptions.set(webContentsId, unsubscribe)

    // Clean up on window close
    event.sender.once('destroyed', () => {
      const unsub = subscriptions.get(webContentsId)
      if (unsub) {
        unsub()
        subscriptions.delete(webContentsId)
      }
    })

    return { success: true }
  })

  // Unsubscribe from watch events
  ipcMain.handle(IPC_CHANNELS.WATCHER_UNSUBSCRIBE_EVENTS, (event) => {
    const webContentsId = event.sender.id
    const unsubscribe = subscriptions.get(webContentsId)
    if (unsubscribe) {
      unsubscribe()
      subscriptions.delete(webContentsId)
    }
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
