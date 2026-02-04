import type { TaskStatus } from '@shared/task-types'

interface TaskOutputProps {
  taskId: string
  output?: string[]
  status: TaskStatus
}

/**
 * Displays agent output for a task
 */
export function TaskOutput({ taskId, output = [], status }: TaskOutputProps) {
  const getEmptyMessage = () => {
    switch (status) {
      case 'queued':
        return 'Waiting to start...'
      case 'running':
        return 'Running...'
      default:
        return 'No output'
    }
  }

  return (
    <div
      data-testid="task-output"
      data-task-id={taskId}
      className="bg-gray-950 rounded p-4 font-mono text-sm h-full overflow-y-auto"
    >
      {output.length === 0 ? (
        <div className="text-gray-500">{getEmptyMessage()}</div>
      ) : (
        output.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {line}
          </div>
        ))
      )}
    </div>
  )
}
