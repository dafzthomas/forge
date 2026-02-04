/**
 * History IPC Handlers
 *
 * Handles IPC communication between renderer and main process for history.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { getHistoryService } from './service'
import type { HistorySearchQuery, ConversationMessage } from './types'

export function registerHistoryIpcHandlers(): void {
  const historyService = getHistoryService()

  // Create a new conversation
  ipcMain.handle(
    IPC_CHANNELS.HISTORY_CREATE_CONVERSATION,
    (_event, taskId: unknown, projectId: unknown, title?: unknown) => {
      try {
        // Validate inputs
        if (typeof taskId !== 'string' || !taskId) {
          return { success: false, error: 'taskId is required and must be a string' }
        }
        if (typeof projectId !== 'string' || !projectId) {
          return {
            success: false,
            error: 'projectId is required and must be a string',
          }
        }
        if (title !== undefined && typeof title !== 'string') {
          return { success: false, error: 'title must be a string' }
        }

        const conversation = historyService.createConversation(
          taskId,
          projectId,
          title as string | undefined
        )
        return { success: true, data: conversation }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // Add a message to a conversation
  ipcMain.handle(
    IPC_CHANNELS.HISTORY_ADD_MESSAGE,
    (_event, conversationId: unknown, message: unknown) => {
      try {
        // Validate conversationId
        if (typeof conversationId !== 'string' || !conversationId) {
          return {
            success: false,
            error: 'conversationId is required and must be a string',
          }
        }

        // Validate message
        if (!message || typeof message !== 'object') {
          return { success: false, error: 'message is required and must be an object' }
        }

        const msg = message as Record<string, unknown>

        // Validate required fields
        if (typeof msg.role !== 'string') {
          return { success: false, error: 'message.role is required and must be a string' }
        }
        if (typeof msg.content !== 'string') {
          return {
            success: false,
            error: 'message.content is required and must be a string',
          }
        }

        // Validate optional fields
        if (msg.toolName !== undefined && typeof msg.toolName !== 'string') {
          return { success: false, error: 'message.toolName must be a string' }
        }
        if (msg.toolInput !== undefined && typeof msg.toolInput !== 'string') {
          return { success: false, error: 'message.toolInput must be a string' }
        }
        if (msg.toolOutput !== undefined && typeof msg.toolOutput !== 'string') {
          return { success: false, error: 'message.toolOutput must be a string' }
        }

        const messageData: Omit<
          ConversationMessage,
          'id' | 'conversationId' | 'timestamp'
        > = {
          role: msg.role as ConversationMessage['role'],
          content: msg.content as string,
          toolName: msg.toolName as string | undefined,
          toolInput: msg.toolInput as string | undefined,
          toolOutput: msg.toolOutput as string | undefined,
        }

        const result = historyService.addMessage(conversationId, messageData)
        return { success: true, data: result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // End a conversation
  ipcMain.handle(
    IPC_CHANNELS.HISTORY_END_CONVERSATION,
    (_event, conversationId: unknown) => {
      try {
        if (typeof conversationId !== 'string' || !conversationId) {
          return {
            success: false,
            error: 'conversationId is required and must be a string',
          }
        }

        historyService.endConversation(conversationId)
        return { success: true, data: null }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // Get a conversation with its messages
  ipcMain.handle(
    IPC_CHANNELS.HISTORY_GET_CONVERSATION,
    (_event, conversationId: unknown) => {
      try {
        if (typeof conversationId !== 'string' || !conversationId) {
          return {
            success: false,
            error: 'conversationId is required and must be a string',
          }
        }

        const conversation = historyService.getConversation(conversationId)
        if (!conversation) {
          return { success: false, error: 'Conversation not found' }
        }

        const messages = historyService.getMessages(conversationId)

        return {
          success: true,
          data: {
            conversation,
            messages,
          },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // Search conversation history
  ipcMain.handle(IPC_CHANNELS.HISTORY_SEARCH, (_event, query: unknown) => {
    try {
      // Validate query object
      if (query && typeof query !== 'object') {
        return { success: false, error: 'query must be an object' }
      }

      const searchQuery: HistorySearchQuery = {}
      const q = (query as Record<string, unknown>) || {}

      // Validate and set optional fields
      if (q.projectId !== undefined) {
        if (typeof q.projectId !== 'string') {
          return { success: false, error: 'query.projectId must be a string' }
        }
        searchQuery.projectId = q.projectId
      }

      if (q.taskId !== undefined) {
        if (typeof q.taskId !== 'string') {
          return { success: false, error: 'query.taskId must be a string' }
        }
        searchQuery.taskId = q.taskId
      }

      if (q.query !== undefined) {
        if (typeof q.query !== 'string') {
          return { success: false, error: 'query.query must be a string' }
        }
        searchQuery.query = q.query
      }

      if (q.startDate !== undefined) {
        searchQuery.startDate = new Date(q.startDate as string)
      }

      if (q.endDate !== undefined) {
        searchQuery.endDate = new Date(q.endDate as string)
      }

      if (q.limit !== undefined) {
        if (typeof q.limit !== 'number') {
          return { success: false, error: 'query.limit must be a number' }
        }
        searchQuery.limit = q.limit
      }

      if (q.offset !== undefined) {
        if (typeof q.offset !== 'number') {
          return { success: false, error: 'query.offset must be a number' }
        }
        searchQuery.offset = q.offset
      }

      const result = historyService.search(searchQuery)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get recent conversations for a project
  ipcMain.handle(
    IPC_CHANNELS.HISTORY_GET_RECENT,
    (_event, projectId: unknown, limit?: unknown) => {
      try {
        if (typeof projectId !== 'string' || !projectId) {
          return {
            success: false,
            error: 'projectId is required and must be a string',
          }
        }

        if (limit !== undefined && typeof limit !== 'number') {
          return { success: false, error: 'limit must be a number' }
        }

        const conversations = historyService.getRecentConversations(
          projectId,
          limit as number | undefined
        )
        return { success: true, data: conversations }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // Export a conversation
  ipcMain.handle(
    IPC_CHANNELS.HISTORY_EXPORT,
    (_event, conversationId: unknown, format: unknown) => {
      try {
        if (typeof conversationId !== 'string' || !conversationId) {
          return {
            success: false,
            error: 'conversationId is required and must be a string',
          }
        }

        if (format !== 'json' && format !== 'markdown') {
          return {
            success: false,
            error: 'format must be either "json" or "markdown"',
          }
        }

        const result = historyService.exportConversation(conversationId, format)
        return { success: true, data: result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // Add a task log
  ipcMain.handle(
    IPC_CHANNELS.HISTORY_LOG,
    (_event, taskId: unknown, level: unknown, message: unknown, metadata?: unknown) => {
      try {
        if (typeof taskId !== 'string' || !taskId) {
          return { success: false, error: 'taskId is required and must be a string' }
        }

        if (
          level !== 'debug' &&
          level !== 'info' &&
          level !== 'warn' &&
          level !== 'error'
        ) {
          return {
            success: false,
            error: 'level must be one of: debug, info, warn, error',
          }
        }

        if (typeof message !== 'string') {
          return { success: false, error: 'message is required and must be a string' }
        }

        if (metadata !== undefined && typeof metadata !== 'object') {
          return { success: false, error: 'metadata must be an object' }
        }

        const log = historyService.log(
          taskId,
          level,
          message,
          metadata as Record<string, unknown> | undefined
        )
        return { success: true, data: log }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // Get task logs
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_LOGS, (_event, taskId: unknown) => {
    try {
      if (typeof taskId !== 'string' || !taskId) {
        return { success: false, error: 'taskId is required and must be a string' }
      }

      const logs = historyService.getTaskLogs(taskId)
      return { success: true, data: logs }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}
