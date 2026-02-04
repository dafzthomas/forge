/**
 * Task types shared between main and renderer processes
 */

/**
 * Possible states for a task
 */
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'

/**
 * Task priority levels - high tasks run before normal, normal before low
 */
export type TaskPriority = 'high' | 'normal' | 'low'

/**
 * A task represents a unit of work to be executed by the agent
 */
export interface Task {
  /** Unique identifier for the task */
  id: string
  /** Project this task belongs to */
  projectId: string
  /** Human-readable description of what the task should accomplish */
  description: string
  /** Optional skill to use for this task */
  skillName?: string
  /** Current status of the task */
  status: TaskStatus
  /** Priority level affecting execution order */
  priority: TaskPriority
  /** Optional model override for this task */
  model?: string
  /** When the task was created */
  createdAt: Date
  /** When the task started executing */
  startedAt?: Date
  /** When the task completed (success or failure) */
  completedAt?: Date
  /** Error message if the task failed */
  error?: string
  /** Task output/result if successful */
  result?: string
}

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  /** Project this task belongs to */
  projectId: string
  /** Human-readable description of what the task should accomplish */
  description: string
  /** Optional skill to use for this task */
  skillName?: string
  /** Priority level (defaults to 'normal') */
  priority?: TaskPriority
  /** Optional model override for this task */
  model?: string
}

/**
 * Database row representation of a task
 */
export interface TaskRow {
  id: string
  project_id: string
  description: string
  skill_name: string | null
  status: TaskStatus
  priority: TaskPriority
  model: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  error: string | null
  result: string | null
}
