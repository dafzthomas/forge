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
  ipcMain.handle(IPC_CHANNELS.REQUEST_REVIEW, async (_event, request: ReviewRequest) => {
    try {
      const result = await reviewService.requestReview(request)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get a review by ID
  ipcMain.handle(IPC_CHANNELS.GET_REVIEW, (_event, id: string) => {
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
  ipcMain.handle(IPC_CHANNELS.LIST_REVIEWS, (_event, projectId: string) => {
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
