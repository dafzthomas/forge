/**
 * Pull Request Types
 *
 * Types for the GitHub PR creation system.
 */

export interface PRRequest {
  projectId: string
  taskId: string
  title?: string       // Auto-generated if not provided
  description?: string // Auto-generated from commits if not provided
  baseBranch?: string  // Default: main or master
  draft?: boolean
}

export interface PRResult {
  id: string
  taskId: string
  projectId: string
  number: number       // GitHub PR number
  url: string          // GitHub PR URL
  title: string
  description: string
  status: 'open' | 'merged' | 'closed'
  createdAt: Date
}

export interface PRRow {
  id: string
  task_id: string
  project_id: string
  number: number
  url: string
  title: string
  description: string
  status: string
  created_at: string
}
