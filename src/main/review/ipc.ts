/**
 * Review IPC Handlers
 *
 * Handles IPC communication between renderer and main process for code reviews.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { getReviewService } from './service'
import type { ReviewRequest } from './types'

export function registerReviewIpcHandlers(): void {
  const reviewService = getReviewService()

  // Request a code review
  ipcMain.handle(IPC_CHANNELS.REQUEST_REVIEW, async (_event, request: unknown) => {
    // Validate request format
    if (!request || typeof request !== 'object') {
      return { success: false, error: 'Invalid request format' }
    }

    const { projectId, taskId, files, focus } = request as Record<string, unknown>

    // Validate required fields
    if (typeof projectId !== 'string' || !projectId) {
      return { success: false, error: 'projectId is required and must be a string' }
    }

    // Validate optional fields
    if (taskId !== undefined && typeof taskId !== 'string') {
      return { success: false, error: 'taskId must be a string' }
    }
    if (files !== undefined && !Array.isArray(files)) {
      return { success: false, error: 'files must be an array' }
    }
    if (files !== undefined && !files.every((f) => typeof f === 'string')) {
      return { success: false, error: 'all files must be strings' }
    }
    if (focus !== undefined && typeof focus !== 'string') {
      return { success: false, error: 'focus must be a string' }
    }

    try {
      const validatedRequest: ReviewRequest = {
        projectId,
        taskId: taskId as string | undefined,
        files: files as string[] | undefined,
        focus: focus as 'security' | 'performance' | 'style' | 'all' | undefined,
      }
      const result = await reviewService.requestReview(validatedRequest)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get a review by ID
  ipcMain.handle(IPC_CHANNELS.GET_REVIEW, (_event, id: unknown) => {
    // Validate input
    if (typeof id !== 'string' || !id) {
      return { success: false, error: 'id is required and must be a string' }
    }

    try {
      const review = reviewService.getReview(id)
      return { success: true, data: review }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // List reviews for a project
  ipcMain.handle(IPC_CHANNELS.LIST_REVIEWS, (_event, projectId: unknown) => {
    // Validate input
    if (typeof projectId !== 'string' || !projectId) {
      return { success: false, error: 'projectId is required and must be a string' }
    }

    try {
      const reviews = reviewService.listReviews(projectId)
      return { success: true, data: reviews }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}
