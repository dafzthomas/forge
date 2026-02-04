import { randomUUID } from 'crypto'
import { getDatabase } from '../database'
import type {
  Task,
  TaskRow,
  TaskStatus,
  CreateTaskInput,
} from '../../shared/task-types'

/**
 * Service for managing the task queue.
 * Tasks are executed in priority order with configurable concurrency.
 */
export class TaskQueueService {
  private maxConcurrent: number = 2

  /**
   * Create a new task and add it to the queue.
   * @param input - Task creation parameters
   * @returns The created task
   * @throws Error if projectId does not exist
   */
  createTask(input: CreateTaskInput): Task {
    const db = getDatabase()

    // Validate projectId exists
    const projectExists = db
      .prepare('SELECT 1 FROM projects WHERE id = ?')
      .get(input.projectId)
    if (!projectExists) {
      throw new Error(`Project not found: ${input.projectId}`)
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    const priority = input.priority || 'normal'

    const stmt = db.prepare(`
      INSERT INTO tasks (id, project_id, description, skill_name, status, priority, model, created_at)
      VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)
    `)

    stmt.run(
      id,
      input.projectId,
      input.description,
      input.skillName ?? null,
      priority,
      input.model ?? null,
      now
    )

    return {
      id,
      projectId: input.projectId,
      description: input.description,
      skillName: input.skillName,
      status: 'queued',
      priority,
      model: input.model,
      createdAt: new Date(now),
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
      result: undefined,
    }
  }

  /**
   * Get all tasks, optionally filtered by project.
   * @param projectId - Optional project ID to filter by
   * @returns Array of tasks, ordered by priority then creation date
   */
  getTasks(projectId?: string): Task[] {
    const db = getDatabase()

    let query = `
      SELECT * FROM tasks
      WHERE 1=1
    `
    const params: string[] = []

    if (projectId) {
      query += ` AND project_id = ?`
      params.push(projectId)
    }

    // Order by priority (high > normal > low), then by creation date (FIFO within priority)
    query += `
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at ASC
    `

    const stmt = db.prepare(query)
    const rows = (params.length > 0 ? stmt.all(...params) : stmt.all()) as TaskRow[]
    return rows.map(this.rowToTask)
  }

  /**
   * Get a single task by ID.
   * @param id - The task ID
   * @returns The task or null if not found
   */
  getTask(id: string): Task | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
    const row = stmt.get(id) as TaskRow | undefined
    return row ? this.rowToTask(row) : null
  }

  /**
   * Cancel a task. Only works for queued or running tasks.
   * @param id - The task ID to cancel
   * @returns true if cancelled, false if task not found or cannot be cancelled
   */
  cancelTask(id: string): boolean {
    const task = this.getTask(id)
    if (!task) {
      return false
    }

    // Can only cancel queued or running tasks
    if (task.status !== 'queued' && task.status !== 'running') {
      return false
    }

    const db = getDatabase()
    const now = new Date().toISOString()
    const stmt = db.prepare(`
      UPDATE tasks
      SET status = 'cancelled', completed_at = ?
      WHERE id = ? AND (status = 'queued' OR status = 'running')
    `)

    const result = stmt.run(now, id)
    return result.changes > 0
  }

  /**
   * Update a task's status, optionally setting result or error.
   * @param id - The task ID
   * @param status - New status
   * @param result - Optional result (for completed tasks)
   * @param error - Optional error message (for failed tasks)
   * @returns The updated task or null if not found
   */
  updateTaskStatus(
    id: string,
    status: TaskStatus,
    result?: string,
    error?: string
  ): Task | null {
    const task = this.getTask(id)
    if (!task) {
      return null
    }

    const db = getDatabase()
    const now = new Date().toISOString()

    // Determine which timestamps to set
    let startedAt: string | null = null
    let completedAt: string | null = null

    if (status === 'running' && !task.startedAt) {
      startedAt = now
    }

    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled'
    ) {
      completedAt = now
    }

    const stmt = db.prepare(`
      UPDATE tasks
      SET status = ?,
          started_at = COALESCE(?, started_at),
          completed_at = COALESCE(?, completed_at),
          result = COALESCE(?, result),
          error = COALESCE(?, error)
      WHERE id = ?
    `)

    stmt.run(status, startedAt, completedAt, result ?? null, error ?? null, id)

    return this.getTask(id)
  }

  /**
   * Get the next task to run based on priority order.
   * Only returns queued tasks.
   * @returns The next task to run or null if none available
   */
  getNextTask(): Task | null {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tasks
      WHERE status = 'queued'
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at ASC
      LIMIT 1
    `)

    const row = stmt.get() as TaskRow | undefined
    return row ? this.rowToTask(row) : null
  }

  /**
   * Get the count of currently running tasks.
   * @returns Number of running tasks
   */
  getRunningCount(): number {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT COUNT(*) as count FROM tasks WHERE status = 'running'`
    )
    const result = stmt.get() as { count: number }
    return result.count
  }

  /**
   * Check if more tasks can be started based on max concurrency.
   * @returns true if more tasks can be started
   */
  canStartMore(): boolean {
    return this.getRunningCount() < this.maxConcurrent
  }

  /**
   * Atomically claim the next task to run.
   * This method combines checking concurrency and updating status in a transaction
   * to prevent race conditions when multiple workers try to claim tasks.
   * @returns The claimed task or null if none available or at max concurrency
   */
  claimNextTask(): Task | null {
    const db = getDatabase()

    const transaction = db.transaction(() => {
      const runningCount = this.getRunningCount()
      if (runningCount >= this.maxConcurrent) {
        return null
      }

      const next = this.getNextTask()
      if (!next) {
        return null
      }

      // Mark as running atomically
      this.updateTaskStatus(next.id, 'running')
      return this.getTask(next.id)
    })

    return transaction()
  }

  /**
   * Set the maximum number of concurrent tasks.
   * @param count - Maximum concurrent tasks
   */
  setMaxConcurrent(count: number): void {
    if (count < 1) {
      throw new Error('Max concurrent must be at least 1')
    }
    this.maxConcurrent = count
  }

  /**
   * Get the current max concurrent setting.
   * @returns Maximum concurrent tasks
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent
  }

  /**
   * Convert a database row to a Task object.
   */
  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      projectId: row.project_id,
      description: row.description,
      skillName: row.skill_name ?? undefined,
      status: row.status,
      priority: row.priority,
      model: row.model ?? undefined,
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      error: row.error ?? undefined,
      result: row.result ?? undefined,
    }
  }
}

// Export singleton instance for convenience
let taskQueueServiceInstance: TaskQueueService | null = null

export function getTaskQueueService(): TaskQueueService {
  if (!taskQueueServiceInstance) {
    taskQueueServiceInstance = new TaskQueueService()
  }
  return taskQueueServiceInstance
}

// Reset singleton (for testing)
export function resetTaskQueueService(): void {
  taskQueueServiceInstance = null
}
