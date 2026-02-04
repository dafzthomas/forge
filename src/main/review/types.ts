/**
 * Code Review Types
 *
 * Types for the agent-driven code review system.
 */

export type ReviewSeverity = 'error' | 'warning' | 'info' | 'suggestion'

export interface ReviewComment {
  id: string
  file: string
  line?: number
  endLine?: number
  severity: ReviewSeverity
  message: string
  suggestion?: string  // Suggested fix
}

export interface ReviewResult {
  id: string
  taskId?: string
  projectId: string
  createdAt: Date
  status: 'pending' | 'completed' | 'failed'
  comments: ReviewComment[]
  summary: string
  approved: boolean
}

export interface ReviewRequest {
  projectId: string
  taskId?: string
  files?: string[]  // Specific files, or all changed files if empty
  focus?: 'security' | 'performance' | 'style' | 'all'
}

/**
 * Database row representation of a review
 */
export interface ReviewRow {
  id: string
  project_id: string
  task_id: string | null
  status: 'pending' | 'completed' | 'failed'
  summary: string
  approved: number  // SQLite uses 0/1 for boolean
  created_at: string
}

/**
 * Database row representation of a review comment
 */
export interface ReviewCommentRow {
  id: string
  review_id: string
  file: string
  line: number | null
  end_line: number | null
  severity: ReviewSeverity
  message: string
  suggestion: string | null
}
