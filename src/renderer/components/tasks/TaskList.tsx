import type { Task, TaskStatus } from '@shared/task-types'
import { TaskCard } from './TaskCard'

interface TaskListProps {
  tasks: Task[]
  selectedTaskId?: string
  onSelectTask?: (taskId: string) => void
  onCancelTask?: (taskId: string) => void
  filter?: TaskStatus | 'all'
}

/**
 * Displays a list of tasks with optional filtering
 */
export function TaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
  onCancelTask,
  filter = 'all',
}: TaskListProps) {
  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  return (
    <div className="space-y-2">
      {filteredTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          selected={task.id === selectedTaskId}
          onSelect={onSelectTask}
          onCancel={onCancelTask}
        />
      ))}
      {filteredTasks.length === 0 && (
        <div className="text-gray-400 text-center py-4">No tasks</div>
      )}
    </div>
  )
}
