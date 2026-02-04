/**
 * PR IPC Handlers
 *
 * Handles IPC communication between renderer and main process for pull requests.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { getPRService } from './service'
import type { PRRequest } from './types'

export function registerPRIpcHandlers(): void {
  const prService = getPRService()

  // Create a PR
  ipcMain.handle(IPC_CHANNELS.PR_CREATE, async (_event, request: unknown) => {
    // Validate request format
    if (!request || typeof request !== 'object') {
      return { success: false, error: 'Invalid request format' }
    }

    const { projectId, taskId, title, description, baseBranch, draft } = request as Record<string, unknown>

    // Validate required fields
    if (typeof projectId !== 'string' || !projectId) {
      return { success: false, error: 'projectId is required and must be a string' }
    }
    if (typeof taskId !== 'string' || !taskId) {
      return { success: false, error: 'taskId is required and must be a string' }
    }

    // Validate optional fields
    if (title !== undefined && typeof title !== 'string') {
      return { success: false, error: 'title must be a string' }
    }
    if (description !== undefined && typeof description !== 'string') {
      return { success: false, error: 'description must be a string' }
    }
    if (baseBranch !== undefined && typeof baseBranch !== 'string') {
      return { success: false, error: 'baseBranch must be a string' }
    }
    if (draft !== undefined && typeof draft !== 'boolean') {
      return { success: false, error: 'draft must be a boolean' }
    }

    try {
      const validatedRequest: PRRequest = {
        projectId,
        taskId,
        title: title as string | undefined,
        description: description as string | undefined,
        baseBranch: baseBranch as string | undefined,
        draft: draft as boolean | undefined,
      }
      const result = await prService.createPR(validatedRequest)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get a PR by ID
  ipcMain.handle(IPC_CHANNELS.PR_GET, (_event, id: unknown) => {
    // Validate input
    if (typeof id !== 'string' || !id) {
      return { success: false, error: 'id is required and must be a string' }
    }

    try {
      const pr = prService.getPR(id)
      return { success: true, data: pr }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // List PRs for a project
  ipcMain.handle(IPC_CHANNELS.PR_LIST, (_event, projectId: unknown) => {
    // Validate input
    if (typeof projectId !== 'string' || !projectId) {
      return { success: false, error: 'projectId is required and must be a string' }
    }

    try {
      const prs = prService.listPRs(projectId)
      return { success: true, data: prs }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Sync PR status from GitHub
  ipcMain.handle(IPC_CHANNELS.PR_SYNC, async (_event, id: unknown) => {
    // Validate input
    if (typeof id !== 'string' || !id) {
      return { success: false, error: 'id is required and must be a string' }
    }

    try {
      const pr = await prService.syncPRStatus(id)
      return { success: true, data: pr }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}
