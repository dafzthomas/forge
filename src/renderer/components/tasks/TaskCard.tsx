import type { MouseEvent } from 'react'
import type { Task, TaskStatus, TaskPriority } from '@shared/task-types'

interface TaskCardProps {
  task: Task
  onCancel?: (taskId: string) => void
  onSelect?: (taskId: string) => void
  selected?: boolean
}

/**
 * Displays the status icon for a task
 */
export function StatusIcon({ status }: { status: TaskStatus }) {
  const icons: Record<TaskStatus, { icon: string; color: string }> = {
    queued: { icon: '○', color: 'text-gray-400' },
    running: { icon: '●', color: 'text-blue-400 animate-pulse' },
    completed: { icon: '✓', color: 'text-green-400' },
    failed: { icon: '✗', color: 'text-red-400' },
    paused: { icon: '⏸', color: 'text-yellow-400' },
    cancelled: { icon: '⊘', color: 'text-gray-500' },
  }
  const { icon, color } = icons[status]
  return (
    <span className={color} role="img" aria-label={`Status: ${status}`}>
      {icon}
    </span>
  )
}

/**
 * Displays the priority badge for a task
 */
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors: Record<TaskPriority, string> = {
    high: 'bg-red-600',
    normal: 'bg-gray-600',
    low: 'bg-gray-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[priority]}`}>
      {priority}
    </span>
  )
}

/**
 * Formats a duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Displays timing information for a task
 */
function TaskTiming({ task }: { task: Task }) {
  if (!task.startedAt) {
    return null
  }

  const startTime = task.startedAt instanceof Date ? task.startedAt : new Date(task.startedAt)
  const endTime = task.completedAt
    ? task.completedAt instanceof Date
      ? task.completedAt
      : new Date(task.completedAt)
    : new Date()

  const duration = endTime.getTime() - startTime.getTime()

  return (
    <span data-testid="task-timing" className="text-xs text-gray-500">
      {formatDuration(duration)}
    </span>
  )
}

/**
 * Displays a single task with status, description, priority, model, timing, and action buttons
 */
export function TaskCard({ task, onCancel, onSelect, selected = false }: TaskCardProps) {
  const canCancel = (task.status === 'queued' || task.status === 'running') && onCancel

  const handleCardClick = () => {
    onSelect?.(task.id)
  }

  const handleCancelClick = (e: MouseEvent) => {
    e.stopPropagation()
    onCancel?.(task.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  return (
    <div
      data-testid="task-card"
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onKeyDown={handleKeyDown}
      className={`p-3 rounded border cursor-pointer hover:bg-gray-800 transition-colors ${
        selected ? 'border-blue-500 bg-gray-800' : 'border-gray-700'
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-2">
        <StatusIcon status={task.status} />
        <span className="flex-1 truncate">{task.description}</span>
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        {task.model && <span className="text-gray-500">{task.model}</span>}
        <TaskTiming task={task} />
        <div className="flex-1" />
        {canCancel && (
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
